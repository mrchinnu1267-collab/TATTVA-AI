/**
 * SSRF Protection and Public URL Validation for Claude MCP Connectors
 * Blocks internal loopback, private RFC-1918 networks, and cloud metadata endpoints.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "metadata.google.internal",
  "169.254.169.254", // AWS/GCP/Azure link-local metadata
]);

/**
 * Validates whether an IPv4 string belongs to a private or reserved network.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }

  // 127.0.0.0/8 (Loopback)
  if (parts[0] === 127) return true;
  // 10.0.0.0/8 (Private)
  if (parts[0] === 10) return true;
  // 172.16.0.0/12 (Private)
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (parts[0] === 192 && parts[1] === 168) return true;
  // 169.254.0.0/16 (Link-local)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0/8
  if (parts[0] === 0) return true;

  return false;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
}

/**
 * Validates that an MCP connector endpoint is an accessible, public HTTPS URL.
 */
export function validateMcpServerUrl(rawUrl: string, allowHttpInDev = false): ValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { valid: false, error: "MCP server URL is required" };
  }

  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Check Protocol
  const isDev = process.env.NODE_ENV !== "production";
  if (parsed.protocol !== "https:") {
    if (parsed.protocol === "http:" && allowHttpInDev && isDev) {
      // Allowed strictly for local testing when enabled
    } else {
      return { valid: false, error: "MCP connector URL must use secure HTTPS protocol" };
    }
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block forbidden hostnames
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    if (!allowHttpInDev || !isDev) {
      return { valid: false, error: "Access to loopback, localhost, and internal metadata is prohibited" };
    }
  }

  // Check IPv4 private networks
  if (isPrivateIPv4(hostname)) {
    if (!allowHttpInDev || !isDev) {
      return { valid: false, error: "Access to private local network ranges (RFC 1918) is prohibited" };
    }
  }

  // Check IPv6 loopback / unique local
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    const rawIpv6 = hostname.slice(1, -1).toLowerCase();
    if (rawIpv6 === "::1" || rawIpv6.startsWith("fe80:") || rawIpv6.startsWith("fc") || rawIpv6.startsWith("fd")) {
      return { valid: false, error: "Private and link-local IPv6 addresses are prohibited" };
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
  };
}
