/**
 * Resilient Authentication Helper for TATTVA AI
 * Bridges Supabase Cloud Authentication with Local Client Session Persistence
 * Eliminates issues with unconfirmed email blocks, rate limits, and multi-step UI friction.
 */

const ACCOUNTS_STORAGE_KEY = "tattva_registered_users";
const SESSION_EMAIL_KEY = "tattva_user_session_email";
const REMEMBER_KEY = "tattva_remember_device";

async function hashPassword(email: string, password: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const salt = `tattva_auth_salt_${normalized}`;
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(salt + password)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getStoredAccounts(): Record<string, { hash: string; createdAt: number }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function registerLocalAccount(email: string, password: string): Promise<void> {
  if (typeof window === "undefined") return;
  const normalized = email.toLowerCase().trim();
  const hash = await hashPassword(normalized, password);
  const accounts = getStoredAccounts();
  accounts[normalized] = {
    hash,
    createdAt: Date.now(),
  };
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  localStorage.setItem(SESSION_EMAIL_KEY, normalized);
  localStorage.setItem(REMEMBER_KEY, "true");
}

export async function verifyLocalAccount(email: string, password: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const normalized = email.toLowerCase().trim();
  const accounts = getStoredAccounts();
  const entry = accounts[normalized];
  if (!entry) return false;
  const hash = await hashPassword(normalized, password);
  return hash === entry.hash;
}

export function isLocalAccountRegistered(email: string): boolean {
  if (typeof window === "undefined") return false;
  const normalized = email.toLowerCase().trim();
  const accounts = getStoredAccounts();
  return Boolean(accounts[normalized]);
}

export function saveActiveSession(email: string): void {
  if (typeof window === "undefined") return;
  const normalized = email.toLowerCase().trim();
  localStorage.setItem(SESSION_EMAIL_KEY, normalized);
  localStorage.setItem(REMEMBER_KEY, "true");
}

export function getActiveSessionEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_EMAIL_KEY);
}

export function clearActiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_EMAIL_KEY);
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem("supabase.auth.token");
}
