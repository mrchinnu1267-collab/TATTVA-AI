// Google Analytics 4 (GA4) Integration & Event Tracking Helper
// Measurement ID: G-MLR64SJF5Q

export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID || "G-MLR64SJF5Q";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Filter out sensitive values (passwords, tokens, emails, keys) to prevent accidental transmission.
 */
function sanitizeEventParams(params?: Record<string, any>): Record<string, any> {
  if (!params) return {};
  const sanitized: Record<string, any> = {};

  const sensitiveKeyPatterns = [
    /pass/i,
    /token/i,
    /secret/i,
    /key/i,
    /auth/i,
    /credential/i,
    /email/i,
    /phone/i,
    /prompt/i,
    /content/i,
    /message/i,
    /query/i,
  ];

  for (const [key, value] of Object.entries(params)) {
    // If the key suggests sensitive or private user content, do not send its raw value
    if (sensitiveKeyPatterns.some((pattern) => pattern.test(key))) {
      if (typeof value === "string") {
        sanitized[key + "_length"] = value.length;
      }
      continue;
    }

    // Do not serialize raw objects or arrays with personal information
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Track SPA Page Views across client-side navigation.
 */
export function pageview(url: string) {
  if (typeof window === "undefined" || !window.gtag) return;
  try {
    window.gtag("event", "page_view", {
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });
  } catch (err) {
    console.debug("[GA4] page_view failed:", err);
  }
}

/**
 * Generic event tracker with safety guardrails.
 */
export function event(action: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || !window.gtag) return;
  try {
    const safeParams = sanitizeEventParams(params);
    window.gtag("event", action, safeParams);
  } catch (err) {
    console.debug(`[GA4] Event ${action} dispatch error:`, err);
  }
}

/**
 * Track user registration (without sensitive PII).
 */
export function trackSignUp(method: string = "email") {
  event("sign_up", { method });
}

/**
 * Track user login (without credentials).
 */
export function trackLogin(method: string = "email") {
  event("login", { method });
}

/**
 * Track user sign-out.
 */
export function trackLogout() {
  event("logout", {});
}

/**
 * Track sending a chat message (metadata only, no message text).
 */
export function trackChatMessageSent(model?: string, promptLength?: number) {
  event("chat_message_sent", {
    ai_model: model || "unknown",
    char_count: promptLength || 0,
  });
}

/**
 * Track image generation / search activity (without private prompt contents).
 */
export function trackImageGeneration(
  tool: "search" | "studio" = "studio",
  categoryOrEngine?: string
) {
  event("image_generation", {
    tool_type: tool,
    engine: categoryOrEngine || "default",
  });
}

/**
 * Track file uploads (without private file data or filenames).
 */
export function trackFileUploaded(fileType?: string, fileSizeKB?: number) {
  event("file_uploaded", {
    file_type: fileType || "unknown",
    file_size_kb: Math.round(fileSizeKB || 0),
  });
}

/**
 * Track file downloads (APK, converted documents, spreadsheets).
 */
export function trackFileDownloaded(format?: string) {
  event("file_downloaded", {
    file_format: format || "apk",
  });
}

