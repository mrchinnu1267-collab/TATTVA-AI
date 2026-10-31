"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error" | "success">("info");

  useEffect(() => {
    try {
      const supabase = createClient();

      // Check current session or listen to PASSWORD_RECOVERY event
      supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
        if (data.session) {
          setHasValidSession(true);
        }
        setSessionChecking(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setHasValidSession(true);
          setSessionChecking(false);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } catch {
      setSessionChecking(false);
    }
  }, []);

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      setMessageType("error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match. Please verify and try again.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      if (data?.user?.email) {
        localStorage.setItem("tattva_user_session_email", data.user.email);
        localStorage.setItem("tattva_remember_device", "true");
      }

      setMessage("Password updated successfully! Redirecting to your chats...");
      setMessageType("success");

      setTimeout(() => {
        router.replace("/chat");
      }, 1200);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to update password.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col justify-between">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-sm font-bold text-white shadow-sm">
              T
            </div>
            <div className="leading-tight">
              <span className="text-sm font-bold tracking-tight">TATTVA AI</span>
              <span className="block text-[11px] font-medium text-neutral-400">Secure Password Reset</span>
            </div>
          </a>
        </div>
      </header>

      {/* Main Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-black/10 bg-white/85 p-7 sm:p-9 shadow-[0_16px_50px_rgba(0,0,0,0.04)] backdrop-blur-2xl">
          <div className="text-center pb-6 border-b border-black/[0.06]">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white text-lg font-black shadow-sm mb-3">
              🔑
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
              Update Your Password
            </h1>
            <p className="mt-1 text-xs text-neutral-500 max-w-xs mx-auto">
              Please enter your new password to regain full access to your encrypted chats.
            </p>
          </div>

          {sessionChecking ? (
            <div className="py-8 text-center text-xs text-neutral-400">
              <span className="inline-block h-3 w-3 rounded-full border-2 border-black border-t-transparent animate-spin mr-2" />
              Verifying secure recovery token...
            </div>
          ) : !hasValidSession ? (
            <div className="py-6 text-center space-y-3">
              <div className="rounded-xl border border-black/10 bg-neutral-50 p-4 text-xs text-neutral-700">
                ⚠️ Your password reset link is invalid or has expired. Please request a new reset link.
              </div>
              <a
                href="/"
                className="inline-block rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
              >
                Back to Login & Reset
              </a>
            </div>
          ) : (
            <form onSubmit={handleReset} className="mt-6 space-y-4">
              {message && (
                <div
                  className={`rounded-xl border p-3 text-xs leading-relaxed ${
                    messageType === "error"
                      ? "border-black/20 bg-neutral-100 text-black font-medium"
                      : messageType === "success"
                      ? "border-black/15 bg-neutral-50 text-neutral-800 font-semibold"
                      : "border-black/10 bg-neutral-50 text-neutral-600"
                  }`}
                >
                  {message}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  disabled={loading}
                  className="w-full rounded-xl border border-black/10 bg-neutral-50/60 p-3 text-xs text-black outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  disabled={loading}
                  className="w-full rounded-xl border border-black/10 bg-neutral-50/60 p-3 text-xs text-black outline-none transition focus:border-black focus:bg-white focus:ring-1 focus:ring-black"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-black text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Updating password...</span>
                  </span>
                ) : (
                  "Update Password & Open Chat ✦"
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-black/[0.06] py-5 px-6 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-center text-xs text-neutral-500">
          <span>TATTVA AI • Created by kotapati Gowtham Chowdary ✨</span>
        </div>
      </footer>
    </main>
  );
}
