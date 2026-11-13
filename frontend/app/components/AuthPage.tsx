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
import { getAuthCallbackUrl } from "../lib/auth-redirect";
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

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
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
  );
}

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
  const [resetCooldown, setResetCooldown] = useState(0);
  const isResetInFlight = useRef(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"info" | "error" | "success">("info");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const hasCheckedAuth = useRef(false);

  // Initialize and tick reset cooldown
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedTarget = sessionStorage.getItem("tattva_reset_cooldown_target");
      if (storedTarget) {
        const remaining = Math.max(0, Math.ceil((parseInt(storedTarget, 10) - Date.now()) / 1000));
        if (remaining > 0) {
          setResetCooldown(remaining);
        } else {
          sessionStorage.removeItem("tattva_reset_cooldown_target");
        }
      }
    }
  }, []);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => {
        if (prev <= 1) {
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("tattva_reset_cooldown_target");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

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

      if (params.get("reset") === "success") {
        setMessage("Your password has been updated successfully. Please log in with your new password.");
        setMessageType("success");
        setMode("signin");
        window.history.replaceState({}, "", window.location.pathname);
        return;
      }

      const reqMode = params.get("mode") || params.get("tab") || params.get("action");
      if (reqMode === "forgot" || params.get("forgot") !== null) {
        setMode("forgot");
        return;
      }
      if (reqMode === "signup" || reqMode === "create-account" || reqMode === "register" || params.get("signup") !== null) {
        setMode("signup");
        return;
      }

      if (params.get("logout") === "true" || params.get("switch") === "true") {
        return;
      }
    }

    // Check if arrived via recovery link or recovery error
    if (
      typeof window !== "undefined" &&
      (window.location.hash.includes("type=recovery") ||
        window.location.search.includes("type=recovery") ||
        window.location.search.includes("error_code=otp_expired") ||
        window.location.hash.includes("error_code=otp_expired"))
    ) {
      router.replace("/reset-password" + window.location.search + window.location.hash);
      return;
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
          if (typeof window !== "undefined" && (window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery"))) {
            router.replace("/reset-password" + window.location.search + window.location.hash);
            return;
          }
          saveActiveSession(res.data.session.user.email);
          router.replace("/chat");
        }
      });
    } catch {
      // offline / client-only fallback
    }
  }, [initialMode, router]);

  async function handleForgotPassword(targetEmail: string) {
    if (isResetInFlight.current || loading || resetCooldown > 0) return;
    isResetInFlight.current = true;
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const redirectUrl = isLocal
        ? `${window.location.origin}/reset-password`
        : "https://tattva-ai-phi.vercel.app/reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        const errMsg = error.message || "";
        const isRateLimit =
          error.status === 429 ||
          errMsg.toLowerCase().includes("rate limit") ||
          (error as unknown as { code?: string }).code === "over_email_send_rate_limit";

        if (isRateLimit) {
          const cooldownSecs = 60;
          setResetCooldown(cooldownSecs);
          if (typeof window !== "undefined") {
            sessionStorage.setItem("tattva_reset_cooldown_target", (Date.now() + cooldownSecs * 1000).toString());
          }
          setMessage("Email rate limit reached: Supabase limits password-reset emails to prevent abuse. Please wait a few minutes before trying again, or check your spam/junk folder for previous emails.");
          setMessageType("error");
          return;
        }

        // Handle custom SMTP dispatch failures
        if (
          errMsg.toLowerCase().includes("error sending recovery email") ||
          (error as unknown as { code?: string }).code === "unexpected_failure"
        ) {
          setMessage(
            "SMTP Configuration Error: The server could not dispatch the recovery email. Please ensure your custom SMTP in Supabase uses Port 587 (STARTTLS) and a valid Google App Password without spaces."
          );
          setMessageType("error");
          return;
        }

        throw error;
      }

      const cooldownSecs = 60;
      setResetCooldown(cooldownSecs);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("tattva_reset_cooldown_target", (Date.now() + cooldownSecs * 1000).toString());
      }
      setMessage("Password reset link has been dispatched to your email. Please check your inbox and spam folder.");
      setMessageType("success");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Failed to send reset link.");
      setMessageType("error");
    } finally {
      isResetInFlight.current = false;
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const callbackUrl = getAuthCallbackUrl("/chat");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            prompt: "select_account",
            access_type: "offline",
          },
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Could not start Google sign-in.");
      setMessageType("error");
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
                ? "Sign up for limitless AI conversations, image studio & intelligent reasoning"
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

          {mode !== "forgot" && (
            <div className="mb-5">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-300 bg-white text-sm font-semibold text-neutral-800 shadow-xs transition hover:bg-neutral-50 hover:border-neutral-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-neutral-900" />
                ) : (
                  <GoogleIcon className="h-5 w-5 shrink-0" />
                )}
                <span>{mode === "signup" ? "Sign up with Google" : "Log in with Google"}</span>
              </button>
              <div className="my-4 flex items-center gap-3 text-[11px] text-neutral-400">
                <span className="h-px flex-1 bg-neutral-200" />
                <span>or continue with email</span>
                <span className="h-px flex-1 bg-neutral-200" />
              </div>
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
              disabled={loading || !email.trim() || (mode !== "forgot" && password.length < 6) || (mode === "forgot" && resetCooldown > 0)}
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
                resetCooldown > 0 ? (
                  `Resend Link in ${resetCooldown}s`
                ) : (
                  "Send Password Reset Link"
                )
              ) : (
                "Log In to TATTVA AI"
              )}
            </button>

            {/* Sub-text info */}
            {mode === "signup" && (
              <p className="text-[11px] text-center text-neutral-400">
                Limitless chats • Smart reasoning • Media studio
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
                    By accessing or using TATTVA AI, you agree to adhere to these Terms of Service. TATTVA AI provides advanced conversational assistance, document generation, and GPU-accelerated image synthesis.
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
