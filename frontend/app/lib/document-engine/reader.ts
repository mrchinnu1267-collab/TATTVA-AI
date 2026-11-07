import { readZip } from "./zip";

export interface ExtractedDocumentContent {
  success: boolean;
  format: string;
  detectedMime: string;
  extractedText: string;
  metadata?: Record<string, any>;
  isBinaryMultimodal?: boolean;
  error?: string;
}

/**
 * Universal Document & File Content Extractor
 * Inspects magic bytes, validates structure, and extracts clean, readable text
 * for PDF, Word (DOCX), Excel (XLSX), PowerPoint (PPTX), CSV, TXT, JSON, and Images.
 */
export async function inspectAndReadDocument(
  buffer: Buffer,
  filename: string,
  claimedMime = "application/octet-stream"
): Promise<ExtractedDocumentContent> {
  if (!buffer || buffer.length === 0) {
    return {
      success: false,
      format: "unknown",
      detectedMime: claimedMime,
      extractedText: "",
      error: "The file is completely empty (0 bytes).",
    };
  }

  const ext = (filename.split(".").pop() || "").toLowerCase();

  // 1. Check for ZIP-based Office OpenXML documents (PK\x03\x04)
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    try {
      const zipFiles = readZip(buffer);

      // A. Word Document (.docx)
      if (zipFiles.has("word/document.xml") || ext === "docx") {
        const docXmlBuf = zipFiles.get("word/document.xml");
        if (!docXmlBuf) {
          return {
            success: false,
            format: "docx",
            detectedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            extractedText: "",
            error: "Word document is corrupted: missing 'word/document.xml' component.",
          };
        }

        const xml = docXmlBuf.toString("utf8");
        // Extract paragraphs and text tags <w:t>
        const paragraphs = xml
          .split(/<\/w:p>/)
          .map((pXml) => {
            const matches = pXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
            return matches
              .map((m) => m.replace(/<[^>]+>/g, ""))
              .join("")
              .trim();
          })
          .filter(Boolean);

        return {
          success: true,
          format: "docx",
          detectedMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          extractedText: paragraphs.join("\n\n"),
          metadata: { paragraphCount: paragraphs.length, sizeBytes: buffer.length },
        };
      }

      // B. Excel Spreadsheet (.xlsx)
      if (zipFiles.has("xl/workbook.xml") || ext === "xlsx") {
        const sharedStrings: string[] = [];
        const ssBuf = zipFiles.get("xl/sharedStrings.xml");
        if (ssBuf) {
          const ssXml = ssBuf.toString("utf8");
          const matches = ssXml.match(/<t[^>]*>([^<]*)<\/t>/g) || [];
          matches.forEach((m) => sharedStrings.push(m.replace(/<[^>]+>/g, "")));
        }

        const sheetsData: string[] = [];
        for (const [name, contentBuf] of zipFiles.entries()) {
          if (name.startsWith("xl/worksheets/sheet") && name.endsWith(".xml")) {
            const sheetXml = contentBuf.toString("utf8");
            const rows = sheetXml.split(/<\/row>/);
            const sheetRows: string[] = [];

            for (const rXml of rows) {
              const cells: string[] = [];
              const cellMatches = rXml.match(/<c\s+[^>]*>[\s\S]*?<\/c>/g) || [];
              for (const c of cellMatches) {
                const isInline = c.includes('t="inlineStr"');
                const isShared = c.includes('t="s"');

                if (isInline) {
                  const tMatch = c.match(/<t[^>]*>([^<]*)<\/t>/);
                  cells.push(tMatch ? tMatch[1] : "");
                } else if (isShared) {
                  const vMatch = c.match(/<v>([^<]*)<\/v>/);
                  const sIdx = vMatch ? parseInt(vMatch[1], 10) : -1;
                  cells.push(sIdx >= 0 && sIdx < sharedStrings.length ? sharedStrings[sIdx] : "");
                } else {
                  const vMatch = c.match(/<v>([^<]*)<\/v>/);
                  cells.push(vMatch ? vMatch[1] : "");
                }
              }
              if (cells.some(Boolean)) {
                sheetRows.push(cells.join(" | "));
              }
            }
            if (sheetRows.length > 0) {
              sheetsData.push(`--- ${name} ---\n` + sheetRows.join("\n"));
            }
          }
        }

        return {
          success: true,
          format: "xlsx",
          detectedMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          extractedText: sheetsData.join("\n\n"),
          metadata: { sheetCount: sheetsData.length, sizeBytes: buffer.length },
        };
      }

      // C. PowerPoint Presentation (.pptx)
      if (zipFiles.has("ppt/presentation.xml") || ext === "pptx") {
        const slideTexts: string[] = [];
        let slideIndex = 1;

        while (zipFiles.has(`ppt/slides/slide${slideIndex}.xml`)) {
          const sBuf = zipFiles.get(`ppt/slides/slide${slideIndex}.xml`)!;
          const sXml = sBuf.toString("utf8");
          const matches = sXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
          const text = matches
            .map((m) => m.replace(/<[^>]+>/g, "").trim())
            .filter(Boolean)
            .join(" • ");

          if (text) {
            slideTexts.push(`[Slide ${slideIndex}]: ${text}`);
          }
          slideIndex++;
        }

        return {
          success: true,
          format: "pptx",
          detectedMime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          extractedText: slideTexts.join("\n\n"),
          metadata: { slideCount: slideIndex - 1, sizeBytes: buffer.length },
        };
      }
    } catch (zipErr) {
      return {
        success: false,
        format: ext || "zip",
        detectedMime: "application/zip",
        extractedText: "",
        error: "Corrupted ZIP archive or damaged OpenXML container.",
      };
    }
  }

  // 2. PDF Document (%PDF-)
  if (buffer.length >= 4 && buffer.slice(0, 4).toString("ascii") === "%PDF") {
    // Extract text streams from uncompressed/FlateDecode streams
    const rawPdf = buffer.toString("binary");
    const textPieces: string[] = [];

    // Search for Tj / TJ text blocks
    const tjMatches = rawPdf.match(/\((.*?)\)\s*Tj/g) || [];
    for (const m of tjMatches) {
      const inner = m.replace(/^\(/, "").replace(/\)\s*Tj$/, "");
      if (inner.trim().length > 1) {
        textPieces.push(inner.replace(/\\([()\\])/g, "$1"));
      }
    }

    const extracted = textPieces.join(" ");

    return {
      success: true,
      format: "pdf",
      detectedMime: "application/pdf",
      extractedText: extracted.length > 50 ? extracted : "[Scanned or Complex Layout PDF - Processable via Multimodal OCR]",
      isBinaryMultimodal: true,
      metadata: { sizeBytes: buffer.length, hasExtractedText: extracted.length > 50 },
    };
  }

  // 3. Images (PNG, JPEG, WEBP)
  if (
    (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) ||
    (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) ||
    (buffer.length >= 12 && buffer.slice(0, 4).toString("ascii") === "RIFF" && buffer.slice(8, 12).toString("ascii") === "WEBP") ||
    claimedMime.startsWith("image/")
  ) {
    const mime =
      buffer[0] === 0x89 ? "image/png" : buffer[0] === 0xff ? "image/jpeg" : "image/webp";

    return {
      success: true,
      format: mime.split("/")[1],
      detectedMime: mime,
      extractedText: `[Image file: ${filename} (${(buffer.length / 1024).toFixed(1)} KB) - Sent for Multimodal Vision & OCR]`,
      isBinaryMultimodal: true,
      metadata: { sizeBytes: buffer.length },
    };
  }

  // 4. Plain Text, CSV, JSON, Markdown, Code Files
  try {
    let text = buffer.toString("utf8");
    // Strip UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    // Verify it is not corrupted binary
    let nullCount = 0;
    const checkLen = Math.min(text.length, 1000);
    for (let i = 0; i < checkLen; i++) {
      if (text.charCodeAt(i) === 0) nullCount++;
    }

    if (nullCount > 5) {
      return {
        success: false,
        format: "binary",
        detectedMime: "application/octet-stream",
        extractedText: "",
        error: "Unsupported binary format or corrupted file.",
      };
    }

    const detectedMime =
      ext === "csv"
        ? "text/csv"
        : ext === "json"
          ? "application/json"
          : ext === "md"
            ? "text/markdown"
            : "text/plain";

    return {
      success: true,
      format: ext || "txt",
      detectedMime,
      extractedText: text,
      metadata: { characterCount: text.length, sizeBytes: buffer.length },
    };
  } catch {
    return {
      success: false,
      format: "unknown",
      detectedMime: claimedMime,
      extractedText: "",
      error: "Unable to decode text stream from file.",
    };
  }
}

