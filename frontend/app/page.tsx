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
} from "lucide-react";
import { createClient } from "./lib/supabase";
import {
  createAccount,
  loginUser,
  getActiveSessionEmail,
  saveActiveSession,
  resetGuestCount,
} from "./lib/local-auth";

type AuthMode = "signin" | "signup" | "forgot";
type ActiveModal = "terms" | "privacy" | "help" | null;

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | "microsoft" | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error" | "success">("info");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const hasCheckedAuth = useRef(false);

  // Auto session check and redirect if already logged in
  useEffect(() => {
    if (hasCheckedAuth.current) return;
    hasCheckedAuth.current = true;

    // Check for query error params
    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error")) {
        const desc = params.get("error_description") || "Authentication link has expired or is invalid.";
        setMessage(desc.replace(/\+/g, " "));
        setMessageType("error");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }
    }

    // Check active session
    try {
      const localEmail = getActiveSessionEmail();
      const remember = localStorage.getItem("tattva_remember_device");
      if (localEmail && remember === "true") {
        router.replace("/chat");
        return;
      }

      const supabase = createClient();
      supabase.auth.getSession().then((res: { data: { session: { user?: { email?: string } } | null } }) => {
        if (res.data?.session?.user?.email) {
          saveActiveSession(res.data.session.user.email);
          router.replace("/chat");
        }
      });
    } catch {
      // offline / client-only fallback
    }
  }, [router]);

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
      // ==========================================
      // CREATE FREE ACCOUNT (SIGN UP)
      // ==========================================
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

        // Account created successfully! Reset guest count and transition to chat
        resetGuestCount();
        setMessage("Account created successfully! Welcome to TATTVA AI ✦");
        setMessageType("success");

        setTimeout(() => {
          router.replace("/chat");
        }, 300);
        return;
      }

      // ==========================================
      // LOG IN (SIGN IN)
      // ==========================================
      const res = await loginUser(trimmedEmail, password);

      if (!res.success) {
        if (res.code === "ACCOUNT_NOT_FOUND" || res.error?.toLowerCase().includes("not found")) {
          setMessage("No account found with this email. Click 'Create Account' above to sign up.");
        } else if (res.code === "INVALID_PASSWORD" || res.error?.toLowerCase().includes("incorrect password")) {
          setMessage("Incorrect password. Please verify your password or use 'Forgot password?'.");
        } else {
          setMessage(res.error || "Invalid login credentials. Please try again.");
        }
        setMessageType("error");
        setLoading(false);
        return;
      }

      // Login success!
      resetGuestCount();
      setMessage("Logged in successfully! Redirecting to TATTVA...");
      setMessageType("success");

      setTimeout(() => {
        router.replace("/chat");
      }, 300);
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

  async function handleOAuthSignIn(provider: "google" | "apple" | "azure") {
    setMessage("");
    const providerKey = provider === "azure" ? "microsoft" : provider;
    setOauthLoading(providerKey);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/chat`,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      const providerTitle = provider === "azure" ? "Microsoft" : provider === "apple" ? "Apple" : "Google";
      setMessage(
        err instanceof Error
          ? `${providerTitle} authentication: ${err.message}`
          : `${providerTitle} sign-in failed. Please verify OAuth settings.`
      );
      setMessageType("error");
      setOauthLoading(null);
    }
  }

  const passwordsMatch = password.length >= 6 && confirmPassword.length >= 6 && password === confirmPassword;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-neutral-50/50 to-white text-neutral-900 font-sans selection:bg-black selection:text-white flex flex-col justify-between antialiased">
      {/* TOP HEADER */}
      <header className="w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white shadow-xs">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-neutral-900">
            TATTVA AI
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            resetGuestCount();
            router.push("/chat");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 shadow-2xs"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Guest Trial (5 free chats) →</span>
        </button>
      </header>

      {/* CENTERED CHATGPT-STYLE AUTHENTICATION CARD */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[400px] mx-auto bg-white rounded-3xl border border-neutral-200/80 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.06)]">
          {/* Centered Brand Icon */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white shadow-md transition-transform hover:scale-105 duration-200">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
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
                : "Log in to access your models, personalized memory & file vault"}
            </p>
          </div>

          {/* TOP SEGMENTED CONTROL TABS (SIGN IN vs CREATE ACCOUNT) */}
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

          {/* Alert Message Banner */}
          {message && (
            <div
              role="alert"
              className={`mb-4 flex items-start gap-2.5 rounded-xl border p-3.5 text-xs leading-relaxed transition ${
                messageType === "error"
                  ? "border-red-200 bg-red-50/80 text-red-900"
                  : messageType === "success"
                  ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
                  : "border-neutral-200 bg-neutral-50 text-neutral-700"
              }`}
            >
              {messageType === "error" ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              ) : messageType === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <Mail className="h-4 w-4 shrink-0 text-neutral-600 mt-0.5" />
              )}
              <div className="flex-1">
                <span>{message}</span>
                {mode === "signin" && message.includes("No account found") && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setMessage("");
                    }}
                    className="block mt-1 font-semibold text-neutral-900 underline"
                  >
                    Switch to Create Account →
                  </button>
                )}
                {mode === "signup" && message.includes("already exists") && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setMessage("");
                    }}
                    className="block mt-1 font-semibold text-neutral-900 underline"
                  >
                    Switch to Log In →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MAIN AUTHENTICATION FORM */}
          <form onSubmit={handleAuthSubmit} className="space-y-3.5">
            {/* Full Name for Sign Up */}
            {mode === "signup" && (
              <div>
                <label htmlFor="auth-name-input" className="block text-xs font-medium text-neutral-700 mb-1">
                  Full Name <span className="text-neutral-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <UserIcon className="h-4 w-4" />
                  </div>
                  <input
                    id="auth-name-input"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Gowtham Chowdary"
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="auth-email-input" className="block text-xs font-medium text-neutral-700 mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="auth-email-input"
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

            {/* Password Input */}
            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-password-input" className="text-xs font-medium text-neutral-700">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setMessage("");
                      }}
                      className="text-xs text-neutral-600 hover:text-black hover:underline"
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
                    id="auth-password-input"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Create a password (min 6 chars)" : "Enter password"}
                    disabled={loading}
                    className="w-full rounded-xl border border-neutral-300 bg-white pl-10 pr-11 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Password (Sign Up only) */}
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
                    type="password"
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !email.trim() || (mode !== "forgot" && password.length < 6)}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-black text-sm font-semibold text-white shadow-xs transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
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

          {/* DIVIDER WITH "OR" */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              OR
            </span>
          </div>

          {/* SOCIAL AUTHENTICATION BUTTONS */}
          <div className="space-y-2">
            {/* Continue with Google */}
            <button
              type="button"
              onClick={() => handleOAuthSignIn("google")}
              disabled={loading || oauthLoading !== null}
              className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-300 bg-white px-4 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-50 shadow-2xs"
            >
              {oauthLoading === "google" ? (
                <span className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-neutral-800 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Continue with Apple */}
            <button
              type="button"
              onClick={() => handleOAuthSignIn("apple")}
              disabled={loading || oauthLoading !== null}
              className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-300 bg-white px-4 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-50 shadow-2xs"
            >
              {oauthLoading === "apple" ? (
                <span className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-neutral-800 animate-spin" />
              ) : (
                <svg className="h-4 w-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 0.6-2.65 1.35-.58.66-1.09 1.73-.95 2.76.99.08 2.05-.51 2.68-1.26z" />
                </svg>
              )}
              <span>Continue with Apple</span>
            </button>

            {/* Continue with Microsoft */}
            <button
              type="button"
              onClick={() => handleOAuthSignIn("azure")}
              disabled={loading || oauthLoading !== null}
              className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-300 bg-white px-4 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-50 shadow-2xs"
            >
              {oauthLoading === "microsoft" ? (
                <span className="h-4 w-4 rounded-full border-2 border-neutral-300 border-t-neutral-800 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#f25022" d="M1 1h10v10H1z" />
                  <path fill="#00a4ef" d="M1 13h10v10H1z" />
                  <path fill="#7fba00" d="M13 1h10v10H13z" />
                  <path fill="#ffb900" d="M13 13h10v10H13z" />
                </svg>
              )}
              <span>Continue with Microsoft</span>
            </button>
          </div>
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
                    Guest mode provides 5 trial conversations. Authenticated users with verified emails receive unlimited chat sessions, private storage, and studio rendering capabilities.
                  </p>
                  <p className="font-semibold text-neutral-900">3. Intellectual Property &amp; Content</p>
                  <p>
                    Artworks generated through TATTVA AI are owned by you to the fullest extent permitted by applicable law. Confidential system prompts, engine configurations, and core application code remain proprietary.
                  </p>
                </>
              )}

              {activeModal === "privacy" && (
                <>
                  <p className="font-semibold text-neutral-900">1. Data Encryption &amp; Privacy</p>
                  <p>
                    Your chat history and generated artworks are cryptographically partitioned and linked solely to your registered email address. We do not sell your personal data or user conversations to third parties.
                  </p>
                  <p className="font-semibold text-neutral-900">2. Secure Authentication</p>
                  <p>
                    OAuth tokens (Google, Apple, Microsoft) and password hashes are securely handled via Supabase infrastructure with TLS encryption in transit and AES encryption at rest.
                  </p>
                  <p className="font-semibold text-neutral-900">3. Device Retention</p>
                  <p>
                    Sessions persist locally on your authenticated device until you explicitly log out, preventing unexpected session loss.
                  </p>
                </>
              )}

              {activeModal === "help" && (
                <>
                  <p className="font-semibold text-neutral-900">How to use TATTVA AI:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Conversational Chat:</strong> Access multilingual natural dialogue with real-time file creation (.pdf, .xlsx, .docx, .txt, etc.).</li>
                    <li><strong>Live Voice Assistant (Sare):</strong> Click &apos;Voice Mode&apos; to speak naturally with real-time speech synthesis and automatic 2-second turn-taking.</li>
                    <li><strong>Image Studio:</strong> Generate photo-realistic visuals with CUDA acceleration, prompt enhancement, and style controls.</li>
                    <li><strong>Password Reset:</strong> Use the &apos;Forgot password?&apos; link to receive a secure recovery email.</li>
                  </ul>
                  <p className="pt-2 text-neutral-500">
                    For technical support or inquiries, please contact your administrator.
                  </p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-5 border-t border-neutral-100 pt-3 text-right">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-xl bg-black px-4 py-2 text-xs font-medium text-white hover:bg-neutral-800 transition"
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