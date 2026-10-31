/**
 * Universal Mobile & Web Download Helper
 * Works across:
 * 1. Native Android App WebView (bridges data/blob URLs directly to Android Downloads via AndroidBridge)
 * 2. Mobile Chrome & Safari (handles Blob & Data URLs without popping up broken about:blank tabs)
 * 3. Desktop browsers
 */
export function triggerDownload(
  dataUriOrBlobUrl: string,
  filename: string,
  mimeType = "application/octet-stream"
) {
  if (typeof window === "undefined") return;

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

  // 2. Standard Web Browser Download
  try {
    const a = document.createElement("a");
    a.href = dataUriOrBlobUrl;
    a.download = filename;
    a.target = "_self";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (err) {
    console.error("Standard download trigger error:", err);
  }
}
