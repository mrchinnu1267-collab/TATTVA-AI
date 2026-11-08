import { trackFileDownloaded } from "./gtag";

/**
 * Converts a base64 Data URI into a pure binary Blob with the exact MIME type.
 * Chunked decoding prevents call stack / buffer overflows and byte truncation on Android.
 */
function dataUriToBlob(dataUri: string, fallbackMime = "application/octet-stream"): Blob {
  try {
    const commaIndex = dataUri.indexOf(",");
    const meta = commaIndex > 0 ? dataUri.slice(0, commaIndex) : "";
    const base64Data = commaIndex > 0 ? dataUri.slice(commaIndex + 1) : dataUri;
    const mimeMatch = meta.match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : fallbackMime;

    const cleanB64 = base64Data.trim().replace(/\s/g, "");
    const binaryStr = atob(cleanB64);
    const len = binaryStr.length;
    const buffer = new ArrayBuffer(len);
    const view = new Uint8Array(buffer);

    for (let i = 0; i < len; i++) {
      view[i] = binaryStr.charCodeAt(i);
    }

    return new Blob([buffer], { type: mime });
  } catch (err) {
    console.warn("[TATTVA Download Helper] Base64 decoding fallback:", err);
    return new Blob([dataUri], { type: fallbackMime });
  }
}

/**
 * Universal Mobile & Web Download Helper
 * Works reliably across:
 * 1. Native Android App WebView (bridges data/blob URLs directly via AndroidBridge)
 * 2. Mobile Chrome on Android (converts data URIs to Blob URLs to prevent download truncation)
 * 3. Mobile Safari on iOS & iPadOS
 * 4. Desktop Chrome, Edge, Safari, Firefox
 */
export async function triggerDownload(
  dataUriOrBlobUrl: string,
  filename: string,
  mimeType = "application/octet-stream"
) {
  if (typeof window === "undefined") return;

  try {
    const ext = filename.split(".").pop() || "bin";
    trackFileDownloaded(ext);
  } catch {
    // ignore
  }

  // 1. Native Android App Bridge Check
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const androidBridge = (window as any).AndroidBridge;
  if (androidBridge && typeof androidBridge.saveBlobOrData === "function") {
    if (dataUriOrBlobUrl.startsWith("blob:")) {
      fetch(dataUriOrBlobUrl)
        .then((r) => r.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            androidBridge.saveBlobOrData(reader.result as string, filename, mimeType);
          };
          reader.readAsDataURL(blob);
        })
        .catch((err) => {
          console.warn("Failed reading blob for AndroidBridge, sending raw:", err);
          androidBridge.saveBlobOrData(dataUriOrBlobUrl, filename, mimeType);
        });
      return;
    }

    androidBridge.saveBlobOrData(dataUriOrBlobUrl, filename, mimeType);
    return;
  }

  // 2. On Mobile Android & iOS: If it's a data URI, convert to a Blob URL
  // Android Chrome strictly requires a Blob URL or HTTP stream for binary files (.pptx, .docx, .xlsx)
  let downloadUrl = dataUriOrBlobUrl;
  let isCreatedBlobUrl = false;

  if (dataUriOrBlobUrl.startsWith("data:")) {
    try {
      const blob = dataUriToBlob(dataUriOrBlobUrl, mimeType);
      downloadUrl = URL.createObjectURL(blob);
      isCreatedBlobUrl = true;
    } catch (e) {
      console.warn("[TATTVA Download Helper] Blob conversion error:", e);
      downloadUrl = dataUriOrBlobUrl;
    }
  }

  // 3. Trigger Browser Download via Anchored Action
  try {
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = downloadUrl;
    a.download = filename;
    a.rel = "noopener noreferrer";
    a.target = "_self";
    document.body.appendChild(a);
    a.click();

    // Delay cleanup by 10 seconds to allow mobile OS download managers to complete stream ingestion
    setTimeout(() => {
      try {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        if (isCreatedBlobUrl) {
          URL.revokeObjectURL(downloadUrl);
        }
      } catch {
        // ignore
      }
    }, 10000);
  } catch (err) {
    console.error("Standard download trigger error:", err);
    // Ultimate fallback: direct window navigation
    window.location.href = downloadUrl;
  }
}
