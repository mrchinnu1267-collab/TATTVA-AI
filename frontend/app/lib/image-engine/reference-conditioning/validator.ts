/**
 * TATTVA AI - Reference Image Validator (Phase B)
 * Validates uploaded reference image formats, dimensions, and file sizes.
 */

import { dataUriToBase64, readImageSize, normalizeAspectRatio } from "../image-utils";
import type { ReferenceImageValidation } from "./types";

export const MAX_REFERENCE_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MIN_DIMENSION_PX = 64;
export const MAX_DIMENSION_PX = 4096;

export const SUPPORTED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

/**
 * Validates an uploaded reference image data URI or base64 string.
 */
export function validateReferenceImage(imageDataUri: string): ReferenceImageValidation {
  if (!imageDataUri || typeof imageDataUri !== "string" || !imageDataUri.trim()) {
    return {
      isValid: false,
      error: "Reference image cannot be empty.",
    };
  }

  const trimmed = imageDataUri.trim();

  // Support direct web URLs (e.g. Unsplash, CDN, or cloud storage links)
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      new URL(trimmed);
      return {
        isValid: true,
        mimeType: "image/jpeg",
        fileSizeBytes: 0,
      };
    } catch {
      return {
        isValid: false,
        error: "Invalid image URL format.",
      };
    }
  }

  const parsed = dataUriToBase64(trimmed);

  if (!parsed) {
    return {
      isValid: false,
      error: "Invalid image format. Expected a standard data URI (e.g., data:image/png;base64,...).",
    };
  }

  const mime = parsed.mime.toLowerCase();
  if (!SUPPORTED_MIME_TYPES.has(mime)) {
    return {
      isValid: false,
      mimeType: mime,
      error: `Unsupported image format: '${mime}'. Supported formats are PNG, JPEG, WebP, and GIF.`,
    };
  }

  // Calculate file size in bytes from base64 string
  const base64Length = parsed.base64.length;
  // Standard base64 byte length formula accounting for padding
  const padding = (parsed.base64.endsWith("==") ? 2 : parsed.base64.endsWith("=") ? 1 : 0);
  const fileSizeBytes = Math.floor((base64Length * 3) / 4) - padding;

  if (fileSizeBytes > MAX_REFERENCE_IMAGE_SIZE_BYTES) {
    const sizeMb = (fileSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      mimeType: mime,
      fileSizeBytes,
      error: `Reference image size (${sizeMb} MB) exceeds maximum allowed limit of 15 MB.`,
    };
  }

  // Dimension validation
  const size = readImageSize(trimmed);
  let format: "png" | "jpeg" | "webp" | "gif" = "png";
  if (mime.includes("jpeg") || mime.includes("jpg")) format = "jpeg";
  else if (mime.includes("webp")) format = "webp";
  else if (mime.includes("gif")) format = "gif";

  if (size) {
    if (size.width < MIN_DIMENSION_PX || size.height < MIN_DIMENSION_PX) {
      return {
        isValid: false,
        format,
        mimeType: mime,
        width: size.width,
        height: size.height,
        fileSizeBytes,
        error: `Reference image dimensions (${size.width}x${size.height}) are below minimum supported resolution of ${MIN_DIMENSION_PX}x${MIN_DIMENSION_PX}.`,
      };
    }

    if (size.width > MAX_DIMENSION_PX || size.height > MAX_DIMENSION_PX) {
      return {
        isValid: false,
        format,
        mimeType: mime,
        width: size.width,
        height: size.height,
        fileSizeBytes,
        error: `Reference image dimensions (${size.width}x${size.height}) exceed maximum supported resolution of ${MAX_DIMENSION_PX}x${MAX_DIMENSION_PX}.`,
      };
    }

    const ratio = size.width / size.height;
    let aspectRatioStr = "1:1";
    if (ratio > 1.5) aspectRatioStr = "16:9";
    else if (ratio > 1.2) aspectRatioStr = "4:3";
    else if (ratio < 0.65) aspectRatioStr = "9:16";
    else if (ratio < 0.85) aspectRatioStr = "3:4";

    return {
      isValid: true,
      format,
      mimeType: mime,
      width: size.width,
      height: size.height,
      aspectRatio: normalizeAspectRatio(aspectRatioStr),
      fileSizeBytes,
    };
  }

  // If intrinsic dimension read failed (e.g. non-standard chunk order), but data is valid base64
  return {
    isValid: true,
    format,
    mimeType: mime,
    width: 1024,
    height: 1024,
    aspectRatio: "1:1",
    fileSizeBytes,
  };
}

