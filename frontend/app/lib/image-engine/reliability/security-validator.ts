/**
 * TATTVA AI - Security, Abuse Prevention & Error Sanitization Engine (Phase K)
 * Validates prompt inputs, inspects reference image formats and sizes, enforces
 * anti-abuse rate limits, and sanitizes user-facing error messages to prevent secret leakage.
 */

const MAX_PROMPT_LENGTH = 2000;
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/jpg"]);

// In-memory sliding window rate limiter: max 20 requests per minute per user/IP
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const rateLimitBuckets = new Map<string, number[]>();

export interface InputValidationResult {
  valid: boolean;
  sanitizedPrompt?: string;
  error?: string;
}

/**
 * Validates and sanitizes prompt input strings.
 */
export function validatePromptInput(rawPrompt: unknown): InputValidationResult {
  if (typeof rawPrompt !== "string") {
    return { valid: false, error: "Prompt must be a string." };
  }

  const trimmed = rawPrompt.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Prompt cannot be empty." };
  }

  if (trimmed.length > MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters (provided: ${trimmed.length}).`,
    };
  }

  // Strip non-printable control characters (except newlines and tabs)
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return { valid: true, sanitizedPrompt: sanitized };
}

/**
 * Validates reference image payloads (Data URI format, MIME type, file size).
 */
export function validateReferenceImagePayload(dataUri: unknown): {
  valid: boolean;
  mimeType?: string;
  sizeBytes?: number;
  error?: string;
} {
  if (!dataUri || typeof dataUri !== "string") {
    return { valid: false, error: "Missing or invalid reference image payload." };
  }

  // Match data URI pattern: data:<mime>;base64,<data>
  const match = dataUri.match(/^data:([a-zA-Z0-9/+-]+);base64,(.+)$/);
  if (!match) {
    return {
      valid: false,
      error: "Invalid image format. Expected a standard Base64 Data URI (e.g. data:image/png;base64,...).",
    };
  }

  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `Unsupported image MIME type: "${mimeType}". Supported formats: PNG, JPEG, WebP.`,
    };
  }

  // Approximate byte size from base64 string length
  const sizeBytes = Math.round((base64Data.length * 3) / 4);
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image exceeds maximum file size limit of 15MB (uploaded size: ${sizeMb}MB).`,
    };
  }

  return { valid: true, mimeType, sizeBytes };
}

/**
 * Sliding window rate limit check.
 */
export function checkRateLimit(identifier: string = "anonymous"): {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
} {
  const now = Date.now();
  let timestamps = rateLimitBuckets.get(identifier);

  if (!timestamps) {
    timestamps = [];
    rateLimitBuckets.set(identifier, timestamps);
  }

  // Remove timestamps outside window
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const validTimestamps = timestamps.filter((t) => t > windowStart);
  rateLimitBuckets.set(identifier, validTimestamps);

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldest = validTimestamps[0];
    const resetSeconds = Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  validTimestamps.push(now);
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - validTimestamps.length,
    resetSeconds: 60,
  };
}

/**
 * Sanitizes user-facing error messages, removing internal stack traces, API keys, and internal URLs.
 */
export function sanitizeUserFacingError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  // Strip API tokens, Bearer strings, and hex keys
  let clean = raw
    .replace(/(Bearer\s+)[a-zA-Z0-9_\-\.]{15,}/gi, "$1[REDACTED_TOKEN]")
    .replace(/(AIza[0-9A-Za-z-_]{35})/g, "[REDACTED_API_KEY]")
    .replace(/(sk-[a-zA-Z0-9_\-]{20,})/gi, "[REDACTED_OPENAI_KEY]")
    .replace(/(hf_[a-zA-Z0-9_]{10,})/gi, "[REDACTED_HF_TOKEN]");

  // Strip internal backend localhost URLs
  clean = clean.replace(/https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/gi, "[INTERNAL_SERVICE]");

  // Strip internal database strings
  clean = clean.replace(/postgres:\/\/[^@]+@[^/]+/gi, "postgres://[REDACTED_CREDENTIALS]");

  // If error contains stack trace lines, keep only the top summary message
  if (clean.includes("\n    at ")) {
    clean = clean.split("\n    at ")[0].trim();
  }

  return clean;
}

/**
 * Resets rate limit buckets (for unit tests).
 */
export function resetRateLimits(): void {
  rateLimitBuckets.clear();
}
