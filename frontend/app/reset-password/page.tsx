"use client";

import { useEffect, useState, useRef } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Check,
  ArrowRight,
  KeyRound,
  Sparkles,
} from "lucide-react";
import { createClient } from "../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  // Form inputs
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error" | "success">("info");

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initializeRecovery() {
      try {
        const supabase = createClient();

        // 1. Check for error parameters passed in URL (e.g. from expired links or Supabase redirect)
        if (typeof window !== "undefined") {
          const searchParams = new URLSearchParams(window.location.search);
          const rawHash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
          const hashParams = new URLSearchParams(rawHash);

          const urlError = searchParams.get("error") || hashParams.get("error");
          const urlErrorCode = searchParams.get("error_code") || hashParams.get("error_code");
          const urlErrorDesc = searchParams.get("error_description") || hashParams.get("error_description");

          if (urlErrorCode === "otp_expired" || urlError || urlErrorDesc) {
            const isExpired =
              urlErrorCode === "otp_expired" ||
              (urlErrorDesc && urlErrorDesc.toLowerCase().includes("expired")) ||
              (urlError && urlError.toLowerCase().includes("expired"));

            const cleanDesc = isExpired
              ? "Your password reset link has expired. Please request a new password reset link."
              : (urlErrorDesc || urlError || "The password reset link is invalid or has expired.").replace(/\+/g, " ");

            setMessage(cleanDesc);
            setMessageType("error");
            setHasValidSession(false);
            setSessionChecking(false);
            return;
          }

          // 2. PKCE code exchange flow (?code=...)
          const code = searchParams.get("code");
          if (code) {
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) {
              setMessage(
                error.message.includes("expired")
                  ? "This password reset link has expired. Please request a new reset link."
                  : error.message
              );
              setMessageType("error");
              setHasValidSession(false);
              setSessionChecking(false);
              return;
            }

            if (data?.session) {
              setHasValidSession(true);
              setUserEmail(data.session.user?.email || "");
              setSessionChecking(false);
              return;
            }
          }

          // 3. OTP verification flow (?token_hash=...&type=recovery)
          const tokenHash = searchParams.get("token_hash");
          const type = searchParams.get("type");
          if (tokenHash && type === "recovery") {
            const { data, error } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: "recovery",
            });

            if (error) {
              setMessage(
                error.message.includes("expired")
                  ? "This password reset link has expired. Please request a new reset link."
                  : error.message
              );
              setMessageType("error");
              setHasValidSession(false);
              setSessionChecking(false);
              return;
            }

            if (data?.session) {
              setHasValidSession(true);
              setUserEmail(data.session.user?.email || "");
              setSessionChecking(false);
              return;
            }
          }
        }

        // 4. Listen for PASSWORD_RECOVERY event or existing recovery session
        const { data: authListener } = supabase.auth.onAuthStateChange((event: string, session: any) => {
          if (event === "PASSWORD_RECOVERY" || (session && session.user)) {
            setHasValidSession(true);
            if (session?.user?.email) {
              setUserEmail(session.user.email);
            }
            setSessionChecking(false);
          }
        });

        // 5. Check if session is already present
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setHasValidSession(true);
          setUserEmail(data.session.user.email || "");
          setSessionChecking(false);
        } else {
          // Allow up to 3.5 seconds for hash parsing / background event before marking as expired
          setTimeout(async () => {
            const retrySession = await supabase.auth.getSession();
            if (retrySession.data?.session?.user) {
              setHasValidSession(true);
              setUserEmail(retrySession.data.session.user.email || "");
            } else {
              setHasValidSession(false);
              if (!message) {
                setMessage("Your password reset link is invalid, expired, or has already been used. Please request a new link.");
                setMessageType("error");
              }
            }
            setSessionChecking(false);
          }, 3500);
        }

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err: unknown) {
        setMessage(err instanceof Error ? err.message : "Failed to verify password recovery session.");
        setMessageType("error");
        setHasValidSession(false);
        setSessionChecking(false);
      }
    }

    initializeRecovery();
  }, [message]);

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    // Enforce Minimum Password Length
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      setMessageType("error");
      return;
    }

    // Enforce Password Confirmation Match
    if (password !== confirmPassword) {
      setMessage("Passwords do not match. Please verify and re-enter.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // 10. Update Password using Supabase Auth
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setMessage("Password updated successfully! Ending recovery session and redirecting to Login...");
      setMessageType("success");

      // 11. End recovery session & clear local cache
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore signout errors
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("tattva_user_session_email");
        localStorage.removeItem("tattva_user_session_name");
        localStorage.removeItem("tattva_remember_device");
        // Clear session cookie if any
        document.cookie = "tattva_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
      }

      // Redirect to Login page with success indicator
      setTimeout(() => {
        router.replace("/login?reset=success");
      }, 1500);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to update password. Please try again.");
      setMessageType("error");
      setLoading(false);
    }
  }

  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const isLengthValid = password.length >= 6;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-neutral-50/50 to-white text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col justify-between antialiased">
      {/* HEADER */}
      <header className="w-full px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden border border-black/10 bg-white shadow-xs p-0.5 transition group-hover:scale-105">
            <img
              src="/logo.png"
              alt="TATTVA AI Logo"
              width={28}
              height={28}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-neutral-900 group-hover:text-black">
              TATTVA AI
            </span>
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">
              Recovery
            </span>
          </div>
        </Link>

        <Link
          href="/login"
          className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition flex items-center gap-1.5"
        >
          <span>Back to Login</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      {/* CENTER RECOVERY CARD */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white/95 p-6 sm:p-8 shadow-xl shadow-black/[0.03] backdrop-blur-xl">
          {/* LOGO & HEADING */}
          <div className="text-center pb-5 border-b border-neutral-100">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white shadow-sm mb-3">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              Reset Your Password
            </h1>
            <p className="mt-1 text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
              {userEmail ? (
                <>
                  Creating new credentials for{" "}
                  <span className="font-semibold text-neutral-800">{userEmail}</span>
                </>
              ) : (
                "Enter your new secure password to restore full access to your account."
              )}
            </p>
          </div>

          {/* STATUS NOTICES */}
          {message && (
            <div
              className={`mt-5 flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs transition-all ${
                messageType === "error"
                  ? "border-red-200 bg-red-50/90 text-red-900"
                  : messageType === "success"
                  ? "border-emerald-200 bg-emerald-50/90 text-emerald-900"
                  : "border-blue-200 bg-blue-50/90 text-blue-900"
              }`}
            >
              {messageType === "error" && <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />}
              {messageType === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />}
              {messageType === "info" && <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />}
              <span className="flex-1 font-medium leading-relaxed">{message}</span>
            </div>
          )}

          {/* VERIFYING TOKEN SPINNER */}
          {sessionChecking ? (
            <div className="py-10 text-center space-y-3">
              <div className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
              <p className="text-xs font-medium text-neutral-500">
                Verifying secure recovery token with Supabase...
              </p>
            </div>
          ) : !hasValidSession ? (
            /* INVALID OR EXPIRED TOKEN STATE */
            <div className="py-6 text-center space-y-4">
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600 leading-relaxed text-left">
                <p className="font-semibold text-neutral-800 mb-1">Link Invalid or Expired</p>
                <p>
                  Password reset links are strictly single-use and expire automatically for your security.
                  Please request a fresh reset link to proceed.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href="/login?mode=forgot"
                  className="flex h-11 w-full items-center justify-center rounded-xl bg-black text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.99]"
                >
                  Request New Reset Link
                </Link>
                <Link
                  href="/login"
                  className="flex h-11 w-full items-center justify-center rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
            /* PASSWORD RESET FORM */
            <form onSubmit={handleReset} className="mt-5 space-y-4">
              {/* NEW PASSWORD */}
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-10 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* CONFIRM NEW PASSWORD */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="confirm-new-password"
                    className="text-xs font-medium text-neutral-700"
                  >
                    Confirm New Password
                  </label>
                  {confirmPassword && (
                    <span className="text-[11px] flex items-center gap-1 font-medium">
                      {passwordsMatch ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Matching
                        </span>
                      ) : (
                        <span className="text-red-500">Must match</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="confirm-new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    disabled={loading}
                    className={`w-full rounded-xl border pl-10 pr-10 py-2.5 text-sm outline-none transition disabled:opacity-50 ${
                      confirmPassword && !passwordsMatch
                        ? "border-red-300 bg-red-50/20 text-neutral-900 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        : "border-neutral-300 bg-white text-neutral-900 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* PASSWORD REQUIREMENTS INDICATOR */}
              <div className="rounded-xl bg-neutral-50 border border-neutral-200/60 p-3 text-[11px] text-neutral-500 space-y-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      isLengthValid ? "bg-emerald-500" : "bg-neutral-300"
                    }`}
                  />
                  <span className={isLengthValid ? "text-emerald-700 font-medium" : ""}>
                    At least 6 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      passwordsMatch ? "bg-emerald-500" : "bg-neutral-300"
                    }`}
                  />
                  <span className={passwordsMatch ? "text-emerald-700 font-medium" : ""}>
                    Passwords match exactly
                  </span>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading || !isLengthValid || !passwordsMatch}
                className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-black text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                    <span>Updating password in Supabase...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <span>Update Password</span>
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition"
                >
                  Cancel and return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full px-6 py-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-2">
        <span>© {new Date().getFullYear()} TATTVA AI. All rights reserved.</span>
        <span>Secure Zero Trust End-to-End Encryption</span>
      </footer>
    </main>
  );
}
