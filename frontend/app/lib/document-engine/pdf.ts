export interface PdfSection {
  heading?: string;
  content?: string;
  paragraphs?: string[];
  bullets?: string[];
  callout?: string;
  table?:
    | (string | number)[][]
    | {
        headers: string[];
        rows: (string | number)[][];
      };
}

export interface PdfPayload {
  title: string;
  subtitle?: string;
  author?: string;
  sections?: PdfSection[];
  rawText?: string;
  content?: string;
}

function escapePdfText(text: string): string {
  return (text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n\t]/g, " ");
}

function cleanPdfText(raw: string): string {
  if (!raw) return "";
  let text = String(raw);
  let prev = "";
  let iterations = 0;
  while (text !== prev && iterations < 10) {
    prev = text;
    iterations++;
    text = text
      .replace(/(?:\*\*\*|___)([\s\S]+?)(?:\*\*\*|___)/g, "$1")
      .replace(/(?:\*\*|__)([\s\S]+?)(?:\*\*|__)/g, "$1")
      .replace(/(?<!\*)\*(?!\*)([^\n]+?)(?<!\*)\*(?!\*)/g, "$1")
      .replace(/(?<!_)_(?!_)([^\n]+?)(?<!_)_(?!_)/g, "$1")
      .replace(/`([^`\n]+)`/g, "$1");
  }
  return text
    .replace(/\[\s*(?:ADVANTAGE|BENEFIT|CHALLENGE|LIMITATION|FEATURE|NOTE|CRITICAL)\s*\]:?\s*/gi, "")
    .replace(/^\*+\s*|\s*\*+$/g, "")
    .replace(/^_+|_+$/g, "")
    .trim();
}

/**
 * Builds a 100% compliant PDF 1.4 binary with mathematically exact xref byte offsets.
 * Opens natively in Adobe Acrobat, Chrome/Edge PDF, macOS Preview, and Android PDF readers.
 */
export function createPdf(payload: PdfPayload): Buffer {
  const title = payload.title || "TATTVA AI Document";
  const subtitle = payload.subtitle || "";

  interface PageContent {
    commands: string[];
  }

  const pages: PageContent[] = [];
  let currentPageCommands: string[] = [];
  let currentY = 738; // Top margin (Letter height = 792)

  function startNewPage() {
    if (currentPageCommands.length > 0) {
      pages.push({ commands: [...currentPageCommands] });
      currentPageCommands = [];
    }
    currentY = 738;
  }

  function addTextLine(text: string, font: "/F1" | "/F2", size: number, colorRgb: [number, number, number] = [0.1, 0.1, 0.1]) {
    if (currentY < 60) {
      startNewPage();
    }
    const escaped = escapePdfText(text);
    const [r, g, b] = colorRgb;
    currentPageCommands.push(
      `BT ${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg ${font} ${size} Tf 54 ${currentY} Td (${escaped}) Tj ET`
    );
    currentY -= size * 1.35;
  }

  function wrapText(text: string, maxCharsPerLine = 78): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if ((currentLine + " " + word).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + " " + word).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Header / Title
  addTextLine(title, "/F2", 22, [0.05, 0.1, 0.2]);
  currentY -= 4;

  if (subtitle) {
    addTextLine(subtitle, "/F1", 12, [0.35, 0.4, 0.45]);
    currentY -= 8;
  }

  // Horizontal divider rule
  currentPageCommands.push(
    `0.85 0.88 0.92 RG 1 w 54 ${currentY} m 558 ${currentY} l S`
  );
  currentY -= 18;

  // Sections
  const sections = payload.sections && payload.sections.length > 0
    ? payload.sections
    : [{ heading: "Document Content", content: payload.content || payload.rawText || "" }];

  for (const sec of sections) {
    if (sec.heading) {
      currentY -= 6;
      addTextLine(cleanPdfText(sec.heading), "/F2", 14, [0.1, 0.15, 0.25]);
      currentY -= 4;
    }

    if (sec.callout) {
      currentY -= 4;
      const calloutText = cleanPdfText(sec.callout);
      const wrapped = wrapText(calloutText, 74);
      wrapped.forEach((line) => {
        addTextLine(`  > ${line}`, "/F1", 10, [0.15, 0.35, 0.55]);
      });
      currentY -= 4;
    }

    const textContent = sec.content || (sec.paragraphs && Array.isArray(sec.paragraphs) ? sec.paragraphs.join("\n\n") : "");
    if (textContent) {
      const paragraphs = textContent.split(/\n\s*\n/);
      for (const p of paragraphs) {
        const rawLines = p.trim().split("\n");
        for (const rawLine of rawLines) {
          const isBullet = rawLine.trim().startsWith("- ") || rawLine.trim().startsWith("* ") || rawLine.trim().startsWith("• ");
          const clean = cleanPdfText(isBullet ? rawLine.trim().replace(/^[-*•]\s+/, "") : rawLine.trim());
          const wrapped = wrapText(clean, isBullet ? 72 : 78);

          wrapped.forEach((line, idx) => {
            if (isBullet && idx === 0) {
              addTextLine(`  • ${line}`, "/F1", 10.5, [0.2, 0.25, 0.3]);
            } else if (isBullet) {
              addTextLine(`    ${line}`, "/F1", 10.5, [0.2, 0.25, 0.3]);
            } else {
              addTextLine(line, "/F1", 10.5, [0.2, 0.25, 0.3]);
            }
          });
          currentY -= 2;
        }
        currentY -= 6;
      }
    }

    if (sec.bullets) {
      for (const b of sec.bullets) {
        const wrapped = wrapText(cleanPdfText(b), 72);
        wrapped.forEach((line, idx) => {
          if (idx === 0) {
            addTextLine(`  • ${line}`, "/F1", 10.5, [0.2, 0.25, 0.3]);
          } else {
            addTextLine(`    ${line}`, "/F1", 10.5, [0.2, 0.25, 0.3]);
          }
        });
        currentY -= 2;
      }
      currentY -= 6;
    }

    const tableRows: (string | number)[][] = Array.isArray(sec.table)
      ? sec.table
      : sec.table && typeof sec.table === "object" && "headers" in sec.table && "rows" in sec.table
      ? [sec.table.headers, ...(sec.table.rows || [])]
      : [];

    if (tableRows.length > 0) {
      currentY -= 8;
      const colWidth = Math.floor(504 / Math.max(1, tableRows[0].length));

      tableRows.slice(0, 30).forEach((row, rowIdx) => {
        if (currentY < 60) startNewPage();
        const isHeader = rowIdx === 0;

        // Draw row background for header
        if (isHeader) {
          currentPageCommands.push(
            `0.94 0.96 0.98 rg 54 ${currentY - 4} ${colWidth * row.length} 18 re f`
          );
        }

        row.forEach((cell, colIdx) => {
          const x = 58 + colIdx * colWidth;
          const text = escapePdfText(String(cell).slice(0, Math.floor(colWidth / 7)));
          const font = isHeader ? "/F2" : "/F1";
          const [r, g, b] = isHeader ? [0.05, 0.1, 0.2] : [0.2, 0.25, 0.3];
          currentPageCommands.push(
            `BT ${r} ${g} ${b} rg ${font} 9 Tf ${x} ${currentY} Td (${text}) Tj ET`
          );
        });

        currentY -= 16;
      });
      currentY -= 10;
    }
  }

  // Push final page
  if (currentPageCommands.length > 0) {
    pages.push({ commands: [...currentPageCommands] });
  }

  if (pages.length === 0) {
    pages.push({ commands: [`BT /F1 12 Tf 54 700 Td (${escapePdfText(title)}) Tj ET`] });
  }

  // Add Page Numbers in footer
  const totalPages = pages.length;
  pages.forEach((page, idx) => {
    const pageNumText = `Page ${idx + 1} of ${totalPages} • Generated by TATTVA AI`;
    page.commands.push(
      `0.85 0.88 0.92 RG 1 w 54 45 m 558 45 l S`,
      `BT 0.45 0.5 0.55 rg /F1 8.5 Tf 210 32 Td (${escapePdfText(pageNumText)}) Tj ET`
    );
  });

  // Construct PDF Objects with exact byte-offset calculation
  const objects: Buffer[] = [];
  const offsets: number[] = [];

  // Header (PDF-1.4 with binary comment)
  const headerBuf = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");

  let currentOffset = headerBuf.length;

  // Obj 1: Catalog
  // Obj 2: Pages
  // Obj 3..N: Page Objects
  // Font Objects: F1 (Obj N+1), F2 (Obj N+2)
  // Content Stream Objects: Obj N+3 ...
  const numPages = pages.length;
  const pageObjIds: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pageObjIds.push(3 + i);
  }
  const fontF1Id = 3 + numPages;
  const fontF2Id = fontF1Id + 1;
  const firstStreamId = fontF2Id + 1;

  function appendObj(objNum: number, content: string | Buffer) {
    offsets[objNum] = currentOffset;
    const bodyBuf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const objHeader = Buffer.from(`${objNum} 0 obj\n`, "utf8");
    const objFooter = Buffer.from("\nendobj\n", "utf8");
    const full = Buffer.concat([objHeader, bodyBuf, objFooter]);
    objects.push(full);
    currentOffset += full.length;
  }

  // 1 0 obj: Catalog
  appendObj(1, `<< /Type /Catalog /Pages 2 0 R >>`);

  // 2 0 obj: Pages
  const kidsStr = pageObjIds.map((id) => `${id} 0 R`).join(" ");
  appendObj(2, `<< /Type /Pages /Kids [${kidsStr}] /Count ${numPages} >>`);

  // Page Objects
  pages.forEach((_, idx) => {
    const pageId = pageObjIds[idx];
    const streamId = firstStreamId + idx;
    appendObj(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontF1Id} 0 R /F2 ${fontF2Id} 0 R >> >> /Contents ${streamId} 0 R >>`
    );
  });

  // Fonts
  appendObj(
    fontF1Id,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  );
  appendObj(
    fontF2Id,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`
  );

  // Content Streams
  pages.forEach((page, idx) => {
    const streamId = firstStreamId + idx;
    const streamContent = page.commands.join("\n");
    const streamBuf = Buffer.from(streamContent, "utf8");
    const streamWrapper = Buffer.concat([
      Buffer.from(`<< /Length ${streamBuf.length} >>\nstream\n`, "utf8"),
      streamBuf,
      Buffer.from("\nendstream", "utf8"),
    ]);
    appendObj(streamId, streamWrapper);
  });

  // XREF Table (exact 20-byte lines per spec: nnnnnnnnnn ggggg f/n \r\n)
  const totalObjects = firstStreamId + numPages; // size = maxObjId + 1
  const xrefHeader = Buffer.from(`xref\n0 ${totalObjects}\n0000000000 65535 f \r\n`, "utf8");
  const xrefEntries: Buffer[] = [xrefHeader];

  for (let i = 1; i < totalObjects; i++) {
    const off = offsets[i] || 0;
    const padded = String(off).padStart(10, "0");
    xrefEntries.push(Buffer.from(`${padded} 00000 n \r\n`, "utf8"));
  }

  const xrefBuf = Buffer.concat(xrefEntries);
  const startXref = currentOffset;

  const trailerBuf = Buffer.from(
    `trailer\n<< /Size ${totalObjects} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`,
    "utf8"
  );

  return Buffer.concat([headerBuf, ...objects, xrefBuf, trailerBuf]);
}

