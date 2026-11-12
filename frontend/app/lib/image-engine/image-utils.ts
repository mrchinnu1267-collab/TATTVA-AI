/** Image helpers shared by the prompt compiler and providers. */

import type { AspectRatio } from "./types";

export const ASPECT_RATIOS: Record<AspectRatio, number> = {
  "1:1": 1,
  "4:3": 4 / 3,
  "3:4": 3 / 4,
  "16:9": 16 / 9,
  "9:16": 9 / 16,
};

export const ASPECT_LABELS: Record<AspectRatio, string> = {
  "1:1": "square",
  "4:3": "landscape 4:3",
  "3:4": "portrait 3:4",
  "16:9": "widescreen 16:9",
  "9:16": "vertical 9:16",
};

export function normalizeAspectRatio(value?: string): AspectRatio {
  if (!value) return "1:1";
  const cleaned = value.replace(/\s/g, "");
  if (cleaned in ASPECT_RATIOS) return cleaned as AspectRatio;
  if (/^(square|1x1)$/i.test(cleaned)) return "1:1";
  if (/^(wide|landscape|16x9)$/i.test(cleaned)) return "16:9";
  if (/^(portrait|story|9x16)$/i.test(cleaned)) return "9:16";
  return "1:1";
}

/** Pixel dimensions per aspect ratio and quality tier. */
export function sizeForAspect(ratio: AspectRatio, quality: "fast" | "balanced" | "max"): {
  width: number;
  height: number;
} {
  const base = quality === "fast" ? 768 : quality === "max" ? 1280 : 1024;
  const value = ASPECT_RATIOS[ratio];
  if (value === 1) return { width: base, height: base };
  if (value > 1) {
    const height = Math.round(base / value / 8) * 8;
    return { width: base, height: clamp(height, 512, 1440) };
  }
  const width = Math.round(base * value / 8) * 8;
  return { width: clamp(width, 512, 1440), height: base };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, multiple = 8): number {
  return Math.max(multiple, Math.round(value / multiple) * multiple);
}

/** Fit dimensions inside an area budget while keeping the aspect ratio. */
export function fitWithinArea(width: number, height: number, area: number, multiple = 8): {
  width: number;
  height: number;
} {
  if (width * height <= area) {
    return { width: roundTo(width, multiple), height: roundTo(height, multiple) };
  }
  const scale = Math.sqrt(area / (width * height));
  return {
    width: roundTo(width * scale, multiple),
    height: roundTo(height * scale, multiple),
  };
}

export function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function dataUriToBase64(dataUri: string): { mime: string; base64: string } | null {
  const match = /^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(dataUri);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

export function bufferToDataUri(buffer: Buffer | Uint8Array, mime = "image/png"): string {
  return `data:${mime};base64,${Buffer.from(buffer).toString("base64")}`;
}

/**
 * Resolves a reference image string (data URI or remote HTTP/HTTPS URL) into a standard data URI.
 */
export async function resolveReferenceImageAsDataUri(ref: string, timeoutMs = 8000): Promise<string> {
  const trimmed = ref.trim();
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const res = await fetch(trimmed, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "image/*" },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch reference image: HTTP ${res.status}`);
    }
    const contentType = res.headers.get("content-type") || "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 15 * 1024 * 1024) {
      throw new Error("Reference image exceeds 15 MB limit.");
    }
    return `data:${contentType};base64,${buf.toString("base64")}`;
  }
  return trimmed;
}

/** Best-effort intrinsic size read from PNG/JPEG headers. */
export function readImageSize(dataUri: string): { width: number; height: number } | null {
  const parsed = dataUriToBase64(dataUri);
  if (!parsed) return null;
  const buffer = Buffer.from(parsed.base64, "base64");
  if (buffer.length < 24) return null;

  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  // JPEG: scan for SOF markers.
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }

  return null;
}
