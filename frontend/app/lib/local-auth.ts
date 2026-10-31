/**
 * Universal Authentication Engine for TATTVA AI
 * Seamlessly integrates server-side PBKDF2 cryptography with Supabase Cloud
 * Eliminates all email confirmation deadlocks, rate-limit stalls, and login failures.
 */

const SESSION_EMAIL_KEY = "tattva_user_session_email";
const SESSION_NAME_KEY = "tattva_user_session_name";
const REMEMBER_KEY = "tattva_remember_device";
const GUEST_COUNT_KEY = "tattva_guest_count";

export interface AuthResult {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  user?: {
    email: string;
    name?: string;
  };
}

export async function createAccount(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  const normEmail = email.toLowerCase().trim();

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normEmail, password, name }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || "Failed to create account. Please try again.",
        code: data.code,
      };
    }

    // Persist session locally and reset guest limits
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_EMAIL_KEY, normEmail);
      if (data.user?.name) {
        localStorage.setItem(SESSION_NAME_KEY, data.user.name);
      }
      localStorage.setItem(REMEMBER_KEY, "true");
      // Unlock limitless chats immediately!
      localStorage.removeItem(GUEST_COUNT_KEY);
      localStorage.setItem(GUEST_COUNT_KEY, "0");
    }

    return {
      success: true,
      message: data.message,
      user: data.user,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error during account registration.",
    };
  }
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const normEmail = email.toLowerCase().trim();

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normEmail, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || "Login failed. Please check your credentials.",
        code: data.code,
      };
    }

    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_EMAIL_KEY, normEmail);
      if (data.user?.name) {
        localStorage.setItem(SESSION_NAME_KEY, data.user.name);
      }
      localStorage.setItem(REMEMBER_KEY, "true");
      // Unlock limitless chats immediately!
      localStorage.removeItem(GUEST_COUNT_KEY);
      localStorage.setItem(GUEST_COUNT_KEY, "0");
    }

    return {
      success: true,
      message: data.message,
      user: data.user,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error during login.",
    };
  }
}

export async function logoutUser(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }

  localStorage.removeItem(SESSION_EMAIL_KEY);
  localStorage.removeItem(SESSION_NAME_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem("supabase.auth.token");
}

export function getActiveSessionEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_EMAIL_KEY);
}

export function getActiveSessionName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_NAME_KEY);
}

export function resetGuestCount(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GUEST_COUNT_KEY);
  localStorage.setItem(GUEST_COUNT_KEY, "0");
}

export function saveActiveSession(email: string, name?: string): void {
  if (typeof window === "undefined") return;
  const normEmail = email.toLowerCase().trim();
  localStorage.setItem(SESSION_EMAIL_KEY, normEmail);
  if (name) {
    localStorage.setItem(SESSION_NAME_KEY, name);
  }
  localStorage.setItem(REMEMBER_KEY, "true");
  resetGuestCount();
}

export async function registerLocalAccount(
  email: string,
  password: string,
  name?: string
): Promise<boolean> {
  const res = await createAccount(email, password, name);
  return res.success;
}

export async function verifyLocalAccount(
  email: string,
  password: string
): Promise<boolean> {
  const res = await loginUser(email, password);
  return res.success;
}
