/**
 * TATTVA AI - Advanced Application Security System
 * Zero Trust Security Architecture & Authorization Engine
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import crypto from "crypto";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { moderateTextPrompt, SAFETY_REJECTION_MESSAGE } from "./content-moderation";

// =============================================================================
// 1. APPLICATION-LEVEL ENCRYPTION (AES-256-GCM)
// =============================================================================

function getEncryptionKey(): Buffer {
  const secret =
    process.env.APP_ENCRYPTION_KEY ||
    process.env.GEMINI_API_KEY ||
    "tattva-default-zero-trust-encryption-master-secret-2026";
  return crypto.createHash("sha256").update(secret).digest();
}

export type EncryptedPayload = {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64
};

/**
 * Encrypt sensitive fields with AES-256-GCM authenticated encryption
 */
export function encryptAES256GCM(plaintext: string): EncryptedPayload {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypt AES-256-GCM encrypted payload with authentication tag validation
 */
export function decryptAES256GCM(payload: EncryptedPayload): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(payload.iv, "base64");
  const tag = Buffer.from(payload.tag, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);

  decipher.setAuthTag(tag);
  let decrypted = decipher.update(payload.ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

// =============================================================================
// 2. PROMPT INJECTION & JAILBREAK GUARDRAIL
// =============================================================================

const INJECTION_PATTERNS = [
  // Direct Instruction Override
  /system\s*(?:instruction\s*)?override/i,
  /ignore\s+(all\s+)?(previous|prior|above|system|user\s+preferences)\s+(instructions|directives|prompts|rules)?/i,
  /disregard\s+(all\s+)?(prior|previous)\s+(instructions|directives)/i,
  /(?:you\s+are\s+now\s+in\s+.*mode|dan\s+mode|developer\s+mode|god\s+mode|unrestricted\s+mode)/i,
  /jailbreak/i,
  /bypass\s+(all\s+)?(content\s+filters|safety\s+guidelines|restrictions|guidelines)/i,

  // Prompt & Secret Exfiltration
  /(print|show|reveal|display|output|dump)\s+(your\s+)?(system\s+prompt|initial\s+prompt|system\s+instructions)/i,
  /(what\s+are\s+your|what\s+is\s+your)\s+(secret\s+keys|api\s+keys|internal\s+prompts)/i,
  /(print|dump|show)\s+(env|environment\s+variables|process\.env)/i,

  // Delimiter Hijacking & Role Emulation
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[INST\]/i,
  /\[\/INST\]/i,
  /---BEGIN\s+SYSTEM\s+PROMPT---/i,
  /---END\s+SYSTEM\s+PROMPT---/i,
];

export type PromptGuardResult = {
  isSafe: boolean;
  threatLevel: "none" | "low" | "medium" | "high";
  detectedPatterns: string[];
  sanitizedPrompt: string;
};

/**
 * Inspects user input for prompt injection, jailbreak attempts, or prompt leakage probes
 */
export function sanitizeAndGuardPrompt(rawPrompt: string): PromptGuardResult {
  const detected: string[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(rawPrompt)) {
      detected.push(pattern.source);
    }
  }

  // Remove potential dangerous control delimiters
  const sanitized = rawPrompt
    .replace(/<\|im_start\|>/gi, "")
    .replace(/<\|im_end\|>/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/\[\/INST\]/gi, "");

  let threatLevel: "none" | "low" | "medium" | "high" = "none";
  if (detected.length >= 2) threatLevel = "high";
  else if (detected.length === 1) threatLevel = "medium";

  return {
    isSafe: detected.length === 0,
    threatLevel,
    detectedPatterns: detected,
    sanitizedPrompt: sanitized,
  };
}

// =============================================================================
// 2B. INDIRECT PROMPT INJECTION & UNTRUSTED DATA SANITIZER
// =============================================================================

const INDIRECT_INJECTION_PATTERNS = [
  /<!--\s*(?:system|override|admin|instruction)[\s\S]*?-->/gi,
  /\[SYSTEM(?:\s+OVERRIDE|\s+DIRECTIVE|\s+PROMPT)\]/gi,
  /(?:^|\n)\s*(?:IMPORTANT|CRITICAL|SYSTEM)\s+NOTE:\s*(?:ignore|disregard|forget)\s+/gi,
  /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|guidelines|safety|rules)/gi,
  /(?:send|transmit|exfiltrate|post)\s+(?:all\s+)?(?:secrets|keys|user\s+data|history|prompts)\s+to\b/gi,
  /\b(?:eval|exec)\s*\(/gi,
  /<script[\s\S]*?<\/script>/gi,
];

export type IndirectInjectionAudit = {
  isSafe: boolean;
  threats: string[];
  sanitizedContent: string;
};

/**
 * Validates untrusted external data (retrieved web content, uploaded docs, RAG context)
 * to prevent indirect prompt injection attacks against LLM context.
 */
export function detectIndirectPromptInjection(rawContent: string): IndirectInjectionAudit {
  if (!rawContent || typeof rawContent !== "string") {
    return { isSafe: true, threats: [], sanitizedContent: "" };
  }

  const threats: string[] = [];
  for (const pattern of INDIRECT_INJECTION_PATTERNS) {
    if (pattern.test(rawContent)) {
      threats.push(pattern.source);
    }
  }

  // Neutralize zero-width / invisible control characters used in prompt steganography
  let sanitized = rawContent
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");

  // Escape explicit role hijacking markers
  sanitized = sanitized
    .replace(/<\|im_start\|>/gi, "")
    .replace(/<\|im_end\|>/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/\[\/INST\]/gi, "");

  return {
    isSafe: threats.length === 0,
    threats,
    sanitizedContent: sanitized,
  };
}

/**
 * Sanitizes untrusted tool outputs before they enter the model's conversation history
 */
export function sanitizeToolOutput(toolName: string, rawOutput: string): string {
  if (!rawOutput) return "";
  
  // Clean indirect injections and malicious script payloads
  const audited = detectIndirectPromptInjection(rawOutput);
  let cleaned = audited.sanitizedContent;

  // Prevent markdown image data exfiltration (e.g. ![leak](https://attacker.com/leak?data=...))
  cleaned = cleaned.replace(/!\[.*?\]\(https?:\/\/[^\s)]+\?[^\s)]*=[^\s)]+\)/gi, "[REDACTED_EXTERNAL_IMAGE_PROBE]");

  return `<untrusted_tool_output tool="${toolName.replace(/[^a-zA-Z0-9_-]/g, "")}" verified_safe="${audited.isSafe}">\n${cleaned.trim()}\n</untrusted_tool_output>`;
}

/**
 * Validates candidate user memories to prevent memory poisoning attacks
 */
export function validateMemoryCandidate(content: string): { isValid: boolean; reason?: string } {
  if (!content || !content.trim()) {
    return { isValid: false, reason: "Memory content cannot be empty" };
  }

  const trimmed = content.trim();
  if (trimmed.length > 1500) {
    return { isValid: false, reason: "Memory exceeds maximum length of 1500 characters" };
  }

  const guard = sanitizeAndGuardPrompt(trimmed);
  if (!guard.isSafe) {
    return { isValid: false, reason: `Potential memory injection detected: ${guard.detectedPatterns.join(", ")}` };
  }

  const indirect = detectIndirectPromptInjection(trimmed);
  if (!indirect.isSafe) {
    return { isValid: false, reason: `Potential indirect injection in memory candidate: ${indirect.threats.join(", ")}` };
  }

  return { isValid: true };
}

// =============================================================================
// 3. PII & CREDENTIAL REDACTION ENGINE
// =============================================================================

const PII_RULES = [
  // Common API Key formats
  { pattern: /\b(sk-[a-zA-Z0-9-_]{20,})\b/g, replacement: "[REDACTED_API_KEY]" },
  { pattern: /\b(AIza[0-9A-Za-z-_]{20,45})\b/g, replacement: "[REDACTED_GOOGLE_KEY]" },
  { pattern: /\b(nvapi-[a-zA-Z0-9-_]{30,})\b/g, replacement: "[REDACTED_NVIDIA_KEY]" },
  { pattern: /\b(hf_[a-zA-Z0-9]{30,})\b/g, replacement: "[REDACTED_HF_TOKEN]" },
  { pattern: /\b(ghp_[a-zA-Z0-9]{30,})\b/g, replacement: "[REDACTED_GITHUB_TOKEN]" },
  { pattern: /\b(sb_publishable_[a-zA-Z0-9-_]{30,})\b/g, replacement: "[REDACTED_SUPABASE_KEY]" },
  { pattern: /(AWS_SECRET_ACCESS_KEY\s*=\s*)([^\s]+)/gi, replacement: "$1[REDACTED_AWS_KEY]" },
  { pattern: /(password\s*(?:is|:|=)\s*)([^\s,;]+)/gi, replacement: "$1[REDACTED_PASSWORD]" },
  { pattern: /\bpostgres(?:ql)?:\/\/[^\s]+/gi, replacement: "[REDACTED_DATABASE_URL]" },
  { pattern: /-----BEGIN [A-Z\s]+ PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z\s]+ PRIVATE KEY-----|\.{3})/gi, replacement: "[REDACTED_PRIVATE_KEY]" },

  // JWT Tokens
  { pattern: /\beyJ[a-zA-Z0-9-_=]+\.eyJ[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_.+/=]+\b/g, replacement: "[REDACTED_JWT]" },

  // US SSN
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[REDACTED_SSN]" },

  // Credit Card numbers (13 to 19 digits)
  { pattern: /\b(?:\d{4}[ -]?){3}(?:\d{4}|\d{1,4})\b/g, replacement: "[REDACTED_CREDIT_CARD]" },
];

/**
 * Redacts sensitive credentials, tokens, and PII from prompt before sending to AI
 */
export function redactSensitiveInfo(text: string): { text: string; redactedCount: number } {
  let redacted = text;
  let count = 0;

  for (const rule of PII_RULES) {
    const matches = redacted.match(rule.pattern);
    if (matches) {
      count += matches.length;
      redacted = redacted.replace(rule.pattern, rule.replacement);
    }
  }

  return { text: redacted, redactedCount: count };
}

/**
 * Post-generation output guardrail ensuring no sensitive server keys appear in assistant responses
 */
export function guardAIOutput(responseText: string): string {
  const secretKeywords = [
    process.env.GEMINI_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.NVIDIA_API_KEY,
    process.env.HF_TOKEN,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_JWT_SECRET,
    process.env.TATTVA_SESSION_SECRET,
    process.env.DATABASE_URL,
    process.env.POSTGRES_PASSWORD,
    process.env.NEXTAUTH_SECRET,
    process.env.CLOUDFLARE_API_TOKEN,
    process.env.FAL_KEY,
  ].filter(Boolean) as string[];

  let guarded = responseText;
  for (const secret of secretKeywords) {
    if (secret && secret.length > 6 && guarded.includes(secret)) {
      guarded = guarded.replaceAll(secret, "[CONFIDENTIAL_DATA_PROTECTED]");
    }
  }

  // Redact exposed JWT strings, Postgres connection strings, and RSA private keys in output
  guarded = guarded
    .replace(/\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+\b/g, "[CONFIDENTIAL_CREDENTIAL_PROTECTED]")
    .replace(/\bpostgres(?:ql)?:\/\/[^\s"'`<>]+/gi, "[CONFIDENTIAL_DATABASE_PROTECTED]")
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/gi, "[CONFIDENTIAL_KEY_PROTECTED]");

  // Never leak raw or dead file: links, duplicate download directives, or internal storage references
  guarded = guarded
    .replace(/(?:📥\s*)?\[(?:Download|Click here to download)[^\]]*\]\((?:file:[^)]*|[^)]*\.(?:pptx|docx|xlsx|pdf|csv))\)\s*🚀?/gi, "")
    .replace(/\(file:[^)]+\)/gi, "")
    .replace(/\bfile:[a-zA-Z0-9_\-./\\]+\b/gi, "")
    .replace(/(?:download|downloading)\s+(?:from\s+)?(?:file:[^\s]+)/gi, "")
    .replace(/You can (?:immediately\s+|easily\s+)?download (?:your\s+|the\s+)?[^\n]*(?:verified\s+)?[^\n]*(?:file|document|presentation|spreadsheet|dataset)[^\n]*/gi, "");

  return guarded;
}

// =============================================================================
// 4. RATE LIMITING ENGINE (SLIDING WINDOW)
// =============================================================================

type RateLimitRecord = {
  timestamps: number[];
};

const rateLimitStore = new Map<string, RateLimitRecord>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

/**
 * In-memory sliding window rate limiter
 */
export function checkRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { timestamps: [] };

  // Remove timestamps outside window
  const validTimestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (validTimestamps.length >= limit) {
    const oldest = validTimestamps[0];
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    limit,
    remaining: limit - validTimestamps.length,
    resetSeconds: Math.ceil(windowMs / 1000),
  };
}

// =============================================================================
// 5. FILE SAFETY & MALWARE SCANNER
// =============================================================================

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/msword", // doc
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/vnd.ms-powerpoint", // ppt
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "application/octet-stream", // Generic binary stream (validated via extension and magic bytes)
]);

export const EXTENSION_MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/markdown",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  py: "text/plain",
  js: "text/plain",
  ts: "text/plain",
  tsx: "text/plain",
  jsx: "text/plain",
  html: "text/html",
  css: "text/css",
  sql: "text/plain",
};

export type FileInspectionResult = {
  isValid: boolean;
  error?: string;
  detectedMime?: string;
};

/**
 * Inspect file buffer for magic bytes, size limits, and malicious executable headers
 */
export function validateAndInspectFile(
  buffer: Buffer,
  filename: string,
  claimedMime: string
): FileInspectionResult {
  // 1. Size Validation
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `File size exceeds maximum allowable limit of 25MB (got ${(buffer.length / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  if (buffer.length === 0) {
    return { isValid: false, error: "Empty file cannot be processed." };
  }

  // 2. Resolve True MIME Type (resolves generic application/octet-stream from Android/mobile browsers)
  const ext = (filename.split(".").pop() || "").toLowerCase();
  let resolvedMime = claimedMime ? claimedMime.toLowerCase() : "";
  if (!resolvedMime || resolvedMime === "application/octet-stream" || resolvedMime === "binary/octet-stream") {
    if (ext && EXTENSION_MIME_MAP[ext]) {
      resolvedMime = EXTENSION_MIME_MAP[ext];
    } else {
      resolvedMime = "application/octet-stream";
    }
  }

  // MIME allowlist check
  if (!ALLOWED_MIME_TYPES.has(resolvedMime) && !resolvedMime.startsWith("text/")) {
    return {
      isValid: false,
      error: `File type '${resolvedMime || ext}' is not permitted. Only documents, spreadsheets, presentations, code, and media are supported.`,
    };
  }

  // 3. Dangerous Executable & Script Magic Bytes Inspection
  // Windows PE Executable (MZ): 0x4D 0x5A
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { isValid: false, error: "Malware alert: Executable binary payload (MZ) detected." };
  }

  // Linux ELF Executable: 0x7F 0x45 0x4C 0x46
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { isValid: false, error: "Malware alert: ELF binary payload detected." };
  }

  // Shell script shebang in text/binary: #!/
  if (buffer.length >= 3 && buffer[0] === 0x23 && buffer[1] === 0x21 && buffer[2] === 0x2f) {
    return { isValid: false, error: "Security alert: Executable shell script header detected." };
  }

  // 4. Magic Byte Verification for common types
  if (resolvedMime === "application/pdf" || ext === "pdf") {
    const header = buffer.slice(0, 5).toString("ascii");
    if (!header.startsWith("%PDF")) {
      return { isValid: false, error: "Corrupted or spoofed PDF header." };
    }
    resolvedMime = "application/pdf";
  } else if (resolvedMime === "image/png" || ext === "png") {
    if (buffer.length < 4 || buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4e || buffer[3] !== 0x47) {
      return { isValid: false, error: "Corrupted or spoofed PNG image header." };
    }
    resolvedMime = "image/png";
  } else if (resolvedMime === "image/jpeg" || ext === "jpg" || ext === "jpeg") {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      return { isValid: false, error: "Corrupted or spoofed JPEG image header." };
    }
    resolvedMime = "image/jpeg";
  } else if (
    resolvedMime.includes("wordprocessingml") ||
    resolvedMime.includes("spreadsheetml") ||
    resolvedMime.includes("presentationml") ||
    ["docx", "xlsx", "pptx"].includes(ext)
  ) {
    // OpenXML must be a valid ZIP archive (PK\x03\x04)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      return {
        isValid: false,
        error: `Corrupted or invalid ${ext.toUpperCase()} archive. File is not a valid OpenXML container.`,
      };
    }
  }

  return { isValid: true, detectedMime: resolvedMime };
}

// =============================================================================
// 6. ZERO TRUST SERVER-SIDE AUTHENTICATION & SESSION VALIDATION
// =============================================================================

export type AuthenticatedSession = {
  authenticated: boolean;
  userId: string;
  email: string;
  name?: string;
  role: string;
  isGuest: boolean;
  workspaceId?: string;
};

export type TattvaSessionPayload = {
  userId?: string;
  email: string;
  name?: string;
  timestamp: number;
  exp?: number;
  verified?: boolean;
};

/**
 * Creates a cryptographically signed session token using HMAC-SHA256
 */
export function createSignedTattvaSession(payload: {
  userId?: string;
  email: string;
  name?: string;
  timestamp?: number;
  verified?: boolean;
}): string {
  const secretKey = getEncryptionKey();
  const sessionData: TattvaSessionPayload = {
    userId: payload.userId || payload.email.toLowerCase().trim(),
    email: payload.email.toLowerCase().trim(),
    name: payload.name || payload.email.split("@")[0],
    timestamp: payload.timestamp || Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
    verified: payload.verified ?? true,
  };
  const data = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
  const signature = crypto.createHmac("sha256", secretKey).update(data).digest("base64url");
  return `${data}.${signature}`;
}

/**
 * Cryptographically verifies an HMAC-SHA256 signed session token.
 * Rejects unsigned, malformed, expired, or tampered tokens using timing-safe comparison.
 */
export function verifySignedTattvaSession(token: string): TattvaSessionPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [dataPart, sigPart] = parts;
  if (!dataPart || !sigPart) {
    return null;
  }

  const secretKey = getEncryptionKey();
  const expectedSig = crypto.createHmac("sha256", secretKey).update(dataPart).digest("base64url");

  const sigBuffer = Buffer.from(sigPart, "utf8");
  const expectedBuffer = Buffer.from(expectedSig, "utf8");

  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null; // Signature mismatch or tampered token
  }

  try {
    const raw = Buffer.from(dataPart, "base64url").toString("utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.email || typeof parsed.email !== "string" || !parsed.email.includes("@")) {
      return null;
    }

    const now = Date.now();
    const maxAgeMs = 30 * 24 * 60 * 60 * 1000; // 30 days maximum
    if (parsed.exp && typeof parsed.exp === "number" && now > parsed.exp) {
      return null; // Expired
    }
    if (parsed.timestamp && typeof parsed.timestamp === "number" && now - parsed.timestamp > maxAgeMs) {
      return null; // Expired
    }

    return parsed as TattvaSessionPayload;
  } catch {
    return null;
  }
}

/**
 * Validates session token from incoming cookies (signed tattva_session or Supabase JWT) or Authorization header.
 * Cryptographically verifies session and extracts user identity.
 */
export async function verifyUserSession(request: Request): Promise<AuthenticatedSession> {
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie");

  // 1. Check TATTVA cryptographically signed session cookie first (HMAC-SHA256)
  if (cookieHeader) {
    const tattvaMatch = cookieHeader.match(/tattva_session=([^;]+)/);
    if (tattvaMatch) {
      const decodedCookie = decodeURIComponent(tattvaMatch[1].trim());
      const verified = verifySignedTattvaSession(decodedCookie);
      if (verified) {
        const normEmail = verified.email.toLowerCase().trim();
        return {
          authenticated: true,
          userId: verified.userId || normEmail,
          email: normEmail,
          name: verified.name || normEmail.split("@")[0],
          role: "authenticated",
          isGuest: false,
        };
      }
    }
  }

  // 2. Check x-tattva-session custom header (strictly requires valid HMAC signature)
  const customHeader = request.headers.get("x-tattva-session");
  if (customHeader) {
    const verified = verifySignedTattvaSession(customHeader.trim());
    if (verified) {
      const normEmail = verified.email.toLowerCase().trim();
      return {
        authenticated: true,
        userId: verified.userId || normEmail,
        email: normEmail,
        name: verified.name || normEmail.split("@")[0],
        role: "authenticated",
        isGuest: false,
      };
    }
  }

  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7).trim();
  } else if (cookieHeader) {
    // Look for Supabase auth token in cookies
    const match =
      cookieHeader.match(/sb-access-token=([^;]+)/) ||
      cookieHeader.match(/supabase-auth-token=([^;]+)/) ||
      cookieHeader.match(/sb-[a-z0-9_-]+-auth-token(?:\.[0-9]+)?=([^;]+)/i);
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        if (decoded.startsWith("base64-")) {
          const rawJson = Buffer.from(decoded.replace("base64-", ""), "base64").toString("utf8");
          const parsed = JSON.parse(rawJson);
          token = parsed.access_token || parsed[0] || decoded;
        } else if (decoded.startsWith("{") || decoded.startsWith("[")) {
          const parsed = JSON.parse(decoded);
          token = parsed.access_token || parsed[0] || decoded;
        } else {
          token = decoded;
        }
      } catch {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (token) {
    // 3. Support development test tokens for automated multi-account security verification
    if (process.env.NODE_ENV !== "production" && token.startsWith("test_user_")) {
      const username = token.replace("test_user_", "").toLowerCase();
      return {
        authenticated: true,
        userId: `usr_${username}_secure_id`,
        email: `${username}@tattva.ai`,
        name: username,
        role: "authenticated",
        isGuest: false,
      };
    }

    // 4. Cryptographic Supabase JWT verification
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase.auth.getUser(token);

        if (!error && data?.user) {
          const email = data.user.email || "";
          return {
            authenticated: true,
            userId: data.user.id,
            email,
            name: data.user.user_metadata?.full_name || email.split("@")[0] || "User",
            role: data.user.role || "authenticated",
            isGuest: false,
          };
        }
      } catch (err) {
        console.warn("[Security] Token verification error:", err);
      }
    }
  }

  // 5. Unauthenticated Guest Fallback
  return {
    authenticated: false,
    userId: "guest_user",
    email: "",
    name: "Guest User",
    role: "guest",
    isGuest: true,
  };
}

// =============================================================================
// 7. SECURITY AUDIT LOGGER (REDACTION-SECURE)
// =============================================================================

export type SecurityEventType =
  | "AUTH_SUCCESS"
  | "AUTH_FAILURE"
  | "UNVERIFIED_AUTH_ATTEMPT"
  | "RATE_LIMIT_EXCEEDED"
  | "PROMPT_INJECTION_BLOCKED"
  | "NSFW_PROMPT_BLOCKED"
  | "MALICIOUS_FILE_BLOCKED"
  | "UNAUTHORIZED_DATA_ACCESS"
  | "KEY_ROTATION_EVENT"
  | "SESSION_REVOKED"
  | "MCP_CONNECTOR_EVENT"
  | "MCP_SECURITY_BLOCKED"
  | "UNAUTHORIZED_ADMIN_BILLING_ACCESS"
  | "REFUND_REQUESTED"
  | "SUBSCRIPTION_CANCELLED"
  | "PAYMENT_VERIFICATION_FAILED"
  | "INVALID_WEBHOOK_PAYLOAD"
  | "WEBHOOK_VERIFICATION_FAILURE";

export type SecurityAuditLog = {
  timestamp: string;
  eventType: SecurityEventType;
  userId?: string;
  ip?: string;
  endpoint?: string;
  details?: Record<string, unknown>;
};

const auditLogBuffer: SecurityAuditLog[] = [];

/**
 * Records a security audit event without logging passwords, tokens, or private secrets
 */
export function logSecurityEvent(
  eventType: SecurityEventType,
  meta: {
    userId?: string;
    ip?: string;
    endpoint?: string;
    details?: Record<string, unknown>;
  }
) {
  // Sanitize details: ensure no password or secret token is ever logged
  const safeDetails: Record<string, unknown> = {};
  if (meta.details) {
    for (const [k, v] of Object.entries(meta.details)) {
      if (/password|token|key|secret|credential|authorization/i.test(k)) {
        safeDetails[k] = "[REDACTED]";
      } else {
        safeDetails[k] = v;
      }
    }
  }

  const logEntry: SecurityAuditLog = {
    timestamp: new Date().toISOString(),
    eventType,
    userId: meta.userId || "anonymous",
    ip: meta.ip || "unknown",
    endpoint: meta.endpoint || "",
    details: safeDetails,
  };

  auditLogBuffer.unshift(logEntry);
  if (auditLogBuffer.length > 500) auditLogBuffer.pop();

  console.log(`[TATTVA-AUDIT] [${logEntry.timestamp}] [${logEntry.eventType}] User: ${logEntry.userId} | IP: ${logEntry.ip} | Route: ${logEntry.endpoint}`);
}

export function getRecentSecurityLogs(limit = 50): SecurityAuditLog[] {
  return auditLogBuffer.slice(0, limit);
}

// =============================================================================
// 7. ADULT / 18+ / NSFW & NUDITY RESTRICTION GUARDRAIL
// =============================================================================

const NSFW_EXPLICIT_PATTERNS: RegExp[] = [
  // Direct Nudity & Unclothed
  /\b(nude|nudity|nudes|naked|nakedness|topless|bottomless|unclothed|unclad|undressed)\b/i,
  /\b(no\s+clothes|without\s+(?:any\s+)?clothes|(?:remov(?:e|ing|ed)|tak(?:e|ing)\s+off)\s+(?:her\s+|all\s+|his\s+|their\s+)?clothes|strip(?:ping|ped|per|tease)?)\b/i,
  // Pornographic & 18+ explicit
  /\b(porn|porno|pornography|pornographic|xxx|nsfw|18\+|erotica|hentai|ecchi|lewd)\b/i,
  // Anatomical and sexual organs
  /\b(bare\s+(?:breasts?|chest|boobs?|body|torso|skin|ass|butt))\b/i,
  /\b(exposed\s+(?:breasts?|genitals?|nipples?|pussy|vagina|penis))\b/i,
  /\b(boob[s]?|boobie[s]?|tits?|titties|areola|nipples?|vagina[s]?|penis[es]?|puss(?:y|ies)|dick[s]?|cock[s]?)\b/i,
  // Sexually explicit actions / poses
  /\b(having\s+sex|sexual\s+(?:act|content|organ|activity|position|scene)|sex\s+scene|explicit\s+sex|masturbat(?:e|ion|ing)|intercourse|sensual\s+nude|erotic\s+pose)\b/i,
  // Provocative / see-through attire intended for nudity bypass
  /\b(lingerie\s+nude|see[- ]through\s+(?:clothes|clothing|dress|bikini)|transparent\s+(?:clothes|clothing|dress))\b/i,
  // Explicit combinations
  /\b(?:nude|naked)\s+(?:girl|woman|model|female|lady|babe|teen|man|boy|person|picture|photo|image|portrait)\b/i,
  /\b(?:girl|woman|model|female|lady|babe|teen|man|boy|person)\s+(?:without\s+clothes|in\s+the\s+nude|naked|nude)\b/i,
];

export type NsfwCheckResult = {
  isBlocked: boolean;
  reason?: string;
  matchedPattern?: string;
};

/**
 * Inspects prompt or text for 18+, adult, nude, or sexually explicit content
 * Backed by the centralized TATTVA AI Content Moderation System
 */
export function isNsfwContent(text: string): NsfwCheckResult {
  if (!text || typeof text !== "string") {
    return { isBlocked: false };
  }

  const result = moderateTextPrompt(text);
  if (!result.isSafe) {
    return {
      isBlocked: true,
      reason: SAFETY_REJECTION_MESSAGE,
      matchedPattern: result.matched,
    };
  }

  return { isBlocked: false };
}
