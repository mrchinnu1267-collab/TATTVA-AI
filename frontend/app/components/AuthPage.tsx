"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  FileText,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  User as UserIcon,
  Check,
  LogIn,
  UserPlus,
} from "lucide-react";
import { createClient } from "../lib/supabase";
import {
  createAccount,
  loginUser,
  getActiveSessionEmail,
  saveActiveSession,
  resetGuestCount,
} from "../lib/local-auth";
import { trackSignUp, trackLogin } from "../lib/gtag";

export type AuthMode = "signin" | "signup" | "forgot";
type ActiveModal = "terms" | "privacy" | "help" | null;

export default function AuthPage({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => {
    if (typeof window !== "undefined") {
      const active = getActiveSessionEmail();
      if (active && active !== "mr.chinnu1267@gmail.com") return active;
      return "";
    }
    return "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error" | "success">("info");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const hasCheckedAuth = useRef(false);

  // Auto session check and query param evaluation
  useEffect(() => {
    if (initialMode === "signup") {
      setMode("signup");
    }

    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    // Check for query parameters
    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error")) {
        const desc = params.get("error_description") || "Authentication link has expired or is invalid.";
        setMessage(desc.replace(/\+/g, " "));
        setMessageType("error");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      if (params.get("logged_out") === "true") {
        setMessage("You have been signed out successfully. Sign in again or continue as guest.");
        setMessageType("info");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const reqMode = params.get("mode") || params.get("tab") || params.get("action");
      if (reqMode === "signup" || reqMode === "create-account" || reqMode === "register" || params.get("signup") !== null) {
        setMode("signup");
        return;
      }

      if (params.get("logout") === "true" || params.get("switch") === "true") {
        return;
      }
    }

    // If already authenticated and not explicitly signing up, redirect to /chat
    try {
      const localEmail = getActiveSessionEmail();
      const remember = localStorage.getItem("tattva_remember_device");
      if (localEmail && remember === "true" && initialMode !== "signup") {
        router.replace("/chat");
        return;
      }

      const supabase = createClient();
      supabase.auth.getSession().then((res: { data: { session: { user?: { email?: string } } | null } }) => {
        if (res.data?.session?.user?.email && initialMode !== "signup") {
          saveActiveSession(res.data.session.user.email);
          router.replace("/chat");
        }
      });
    } catch {
      // offline / client-only fallback
    }
  }, [initialMode, router]);

  async function handleForgotPassword(targetEmail: string) {
    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setMessage("Password reset link has been dispatched to your email. Please check your inbox.");
      setMessageType("success");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to send reset link.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@") || !trimmedEmail.includes(".")) {
      setMessage("Please enter a valid email address.");
      setMessageType("error");
      return;
    }

    if (mode === "forgot") {
      await handleForgotPassword(trimmedEmail);
      return;
    }

    if (password.length < 6) {
      setMessage("Password must contain at least 6 characters.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      // 1. SIGN UP (CREATE FREE ACCOUNT)
      if (mode === "signup") {
        if (password !== confirmPassword) {
          setMessage("Passwords do not match. Please verify your confirm password.");
          setMessageType("error");
          setLoading(false);
          return;
        }

        const res = await createAccount(trimmedEmail, password, fullName.trim());

        if (!res.success) {
          if (res.code === "ACCOUNT_EXISTS" || res.error?.toLowerCase().includes("already registered")) {
            setMessage("An account with this email already exists. Please log in with your password.");
            setMessageType("error");
            setMode("signin");
          } else {
            setMessage(res.error || "Failed to create account. Please check your credentials.");
            setMessageType("error");
          }
          setLoading(false);
          return;
        }

        resetGuestCount();
        trackSignUp("email");
        setMessage("Account created successfully! Welcome to TATTVA AI ✦");
        setMessageType("success");

        setTimeout(() => {
          router.replace("/chat");
        }, 350);
        return;
      }

      // 2. LOG IN (SIGN IN)
      const res = await loginUser(trimmedEmail, password);

      if (!res.success) {
        if (res.code === "ACCOUNT_NOT_FOUND" || res.error?.toLowerCase().includes("not found")) {
          setMessage("No account found with this email. Click 'Create Account' to sign up.");
        } else if (res.code === "INVALID_PASSWORD" || res.error?.toLowerCase().includes("incorrect password")) {
          setMessage("Incorrect password. Please verify your password or use 'Forgot password?'.");
        } else {
          setMessage(res.error || "Invalid login credentials. Please try again.");
        }
        setMessageType("error");
        setLoading(false);
        return;
      }

      resetGuestCount();
      trackLogin("email");
      setMessage("Logged in successfully! Redirecting to TATTVA...");
      setMessageType("success");

      setTimeout(() => {
        router.replace("/chat");
      }, 350);
    } catch (err: unknown) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Authentication encountered an error. Please verify your network."
      );
      setMessageType("error");
      setLoading(false);
    }
  }

  const passwordsMatch = password.length >= 6 && confirmPassword.length >= 6 && password === confirmPassword;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-neutral-50/50 to-white text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col justify-between antialiased">
      {/* TOP HEADER */}
      <header className="w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => router.push("/chat")}>
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden border border-black/10 bg-white shadow-xs p-0.5">
            <img
              src="/logo.png"
              alt="TATTVA AI"
              className="h-full w-full object-contain"
            />
          </div>
          <span className="text-sm font-bold tracking-tight text-neutral-900">
            TATTVA AI
          </span>
        </div>

        <div className="flex items-center gap-2">
          {mode === "signin" ? (
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-black text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-neutral-800 transition shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setMessage("");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white text-neutral-800 px-3.5 py-1.5 text-xs font-semibold hover:bg-neutral-50 transition shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log In</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push("/chat")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 shadow-2xs"
            title="Explore chat without signing in"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Continue as Guest →</span>
          </button>
        </div>
      </header>

      {/* CENTERED CHATGPT-STYLE AUTHENTICATION CARD */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[420px] mx-auto bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          {/* Centered Brand Icon */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl overflow-hidden border border-black/10 bg-white shadow-md transition-transform hover:scale-105 duration-200 p-1">
              <img
                src="/logo.png"
                alt="TATTVA AI"
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {mode === "signin"
                ? "Welcome back"
                : mode === "signup"
                ? "Create your account"
                : "Reset your password"}
            </h1>
            <p className="mt-1 text-xs text-neutral-500 leading-normal">
              {mode === "forgot"
                ? "Enter your email to receive a password reset link"
                : mode === "signup"
                ? "Sign up for limitless AI conversations, voice assistant & image studio"
                : "Log in to access your chat history, personalized memory & file vault"}
            </p>
          </div>

          {/* TOP SEGMENTED CONTROL TABS (LOG IN vs CREATE ACCOUNT) */}
          {mode !== "forgot" && (
            <div className="flex p-1 mb-5 bg-neutral-100 rounded-xl border border-neutral-200/60">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setMessage("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === "signin"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setMessage("");
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === "signup"
                    ? "bg-white text-neutral-900 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* STATUS / ERROR / SUCCESS ALERTS */}
          {message && (
            <div
              className={`mb-5 flex items-start gap-2.5 rounded-2xl border p-3.5 text-xs transition-all ${
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

          {/* AUTHENTICATION FORM */}
          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {/* FULL NAME (SIGN UP ONLY) */}
            {mode === "signup" && (
              <div>
                <label htmlFor="auth-fullname" className="block text-xs font-medium text-neutral-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="auth-fullname"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* EMAIL ADDRESS */}
            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-neutral-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  disabled={loading}
                  className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
                />
              </div>
            </div>

            {/* PASSWORD */}
            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-password" className="text-xs font-medium text-neutral-700">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setMessage("");
                      }}
                      className="text-xs font-medium text-neutral-500 hover:text-black hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
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
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* CONFIRM PASSWORD (SIGN UP ONLY) */}
            {mode === "signup" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-confirm-password" className="text-xs font-medium text-neutral-700">
                    Confirm Password
                  </label>
                  {confirmPassword && (
                    <span className="text-[11px] flex items-center gap-1 font-medium">
                      {passwordsMatch ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Matching
                        </span>
                      ) : (
                        <span className="text-red-500">Passwords don&apos;t match</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your password"
                    disabled={loading}
                    className={`w-full rounded-xl border bg-white pl-10 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:ring-1 disabled:opacity-50 ${
                      confirmPassword && !passwordsMatch
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900"
                    }`}
                  />
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading || !email.trim() || (mode !== "forgot" && password.length < 6)}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-black text-sm font-semibold text-white shadow-xs transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>
                    {mode === "signup"
                      ? "Creating Account..."
                      : mode === "forgot"
                      ? "Sending Link..."
                      : "Verifying..."}
                  </span>
                </span>
              ) : mode === "signup" ? (
                "Create Free Account"
              ) : mode === "forgot" ? (
                "Send Password Reset Link"
              ) : (
                "Log In to TATTVA AI"
              )}
            </button>

            {/* Sub-text info */}
            {mode === "signup" && (
              <p className="text-[11px] text-center text-neutral-400">
                Limitless chats • Real-time voice • Media studio
              </p>
            )}

            {/* Mode Switcher Links */}
            <div className="text-center pt-1 text-xs text-neutral-600">
              {mode === "signin" ? (
                <span>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setMessage("");
                    }}
                    className="font-semibold text-neutral-900 hover:underline"
                  >
                    Create free account
                  </button>
                </span>
              ) : mode === "signup" ? (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setMessage("");
                    }}
                    className="font-semibold text-neutral-900 hover:underline"
                  >
                    Log in
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setMessage("");
                  }}
                  className="font-medium text-neutral-600 hover:text-black hover:underline"
                >
                  ← Back to Log In
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* FOOTER: TERMS OF SERVICE, PRIVACY POLICY, HELP CENTER */}
      <footer className="w-full py-5 px-6 border-t border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-center gap-4 text-xs text-neutral-500">
          <button
            type="button"
            onClick={() => setActiveModal("terms")}
            className="hover:text-neutral-900 transition underline-offset-4 hover:underline"
          >
            Terms of Service
          </button>
          <span className="hidden sm:inline text-neutral-300">|</span>
          <button
            type="button"
            onClick={() => setActiveModal("privacy")}
            className="hover:text-neutral-900 transition underline-offset-4 hover:underline"
          >
            Privacy Policy
          </button>
          <span className="hidden sm:inline text-neutral-300">|</span>
          <button
            type="button"
            onClick={() => setActiveModal("help")}
            className="hover:text-neutral-900 transition underline-offset-4 hover:underline"
          >
            Help Center
          </button>
        </div>
        <div className="mt-2 text-center text-[11px] text-neutral-400">
          TATTVA AI • Created by kotapati Gowtham Chowdary
        </div>
      </footer>

      {/* MODAL DIALOGS (TERMS / PRIVACY / HELP) */}
      {activeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs transition-opacity"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-2.5">
                {activeModal === "terms" && <FileText className="h-5 w-5 text-neutral-800" />}
                {activeModal === "privacy" && <ShieldCheck className="h-5 w-5 text-neutral-800" />}
                {activeModal === "help" && <HelpCircle className="h-5 w-5 text-neutral-800" />}
                <h3 className="text-base font-semibold text-neutral-900">
                  {activeModal === "terms" && "Terms of Service"}
                  {activeModal === "privacy" && "Privacy Policy"}
                  {activeModal === "help" && "TATTVA Help Center"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1 text-xs text-neutral-600 leading-relaxed space-y-3">
              {activeModal === "terms" && (
                <>
                  <p className="font-semibold text-neutral-900">1. Acceptance of Terms</p>
                  <p>
                    By accessing or using TATTVA AI, you agree to adhere to these Terms of Service. TATTVA AI provides advanced conversational assistance, real-time voice interaction, and GPU-accelerated image synthesis.
                  </p>
                  <p className="font-semibold text-neutral-900">2. Usage &amp; Access Tiers</p>
                  <p>
                    Guest mode provides trial conversations. Authenticated users with verified emails receive unlimited chat sessions, private storage, and studio rendering capabilities.
                  </p>
                  <p className="font-semibold text-neutral-900">3. Intellectual Property &amp; Content</p>
                  <p>
                    Artworks generated through TATTVA AI are owned by you to the fullest extent permitted by applicable law. Confidential system prompts, engine configurations, and core application code remain proprietary.
                  </p>
                </>
              )}

              {activeModal === "privacy" && (
                <>
                  <p className="font-semibold text-neutral-900">Zero Trust Data Privacy</p>
                  <p>
                    TATTVA AI operates under strict Zero Trust encryption protocols. Sensitive fields are protected using AES-256-GCM. Personal identification information (PII) is automatically masked.
                  </p>
                  <p className="font-semibold text-neutral-900">Row Level Security</p>
                  <p>
                    All database queries are bound to isolated tenant boundaries governed by PostgreSQL Row Level Security (RLS) policies.
                  </p>
                </>
              )}

              {activeModal === "help" && (
                <>
                  <p className="font-semibold text-neutral-900">Need Assistance?</p>
                  <p>
                    Reach out for technical questions, billing inquiries, or API key management assistance.
                  </p>
                  <div className="rounded-xl bg-neutral-50 p-3 font-mono text-[11px] text-neutral-700">
                    Developer &amp; Founder: kotapati Gowtham Chowdary
                    <br />
                    Direct Contact: mr.chinnu1267@gmail.com
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
