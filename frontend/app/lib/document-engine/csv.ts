export type CsvInput =
  | (string | number | boolean | null | undefined)[][]
  | string
  | { content?: string; data?: (string | number | boolean | null | undefined)[][]; rows?: (string | number | boolean | null | undefined)[][]; title?: string };

/**
 * Builds an RFC 4180-compliant CSV buffer with UTF-8 BOM (\uFEFF)
 * Opens cleanly in Microsoft Excel, Google Sheets, LibreOffice, and mobile viewers
 */
export function createCsv(data: CsvInput): Buffer {
  let rows: (string | number | boolean | null | undefined)[][] = [];

  if (typeof data === "string") {
    rows = data
      .trim()
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          // Markdown table line
          return trimmed
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
            .filter((_, idx, arr) => !arr.every((cell) => /^[-:]+$/.test(cell)));
        }
        return trimmed.split(/,|\t/).map((c) => c.trim());
      })
      .filter((r) => r.length > 0 && !r.every((c) => /^[-:]+$/.test(c)));
  } else if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object") {
    if (Array.isArray(data.rows)) {
      rows = data.rows;
    } else if (Array.isArray(data.data)) {
      rows = data.data;
    } else if (typeof data.content === "string") {
      return createCsv(data.content);
    }
  }

  const lines = rows.map((row) =>
    row
      .map((cell) => {
        if (cell === null || cell === undefined) return "";
        const str = String(cell);
        if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );

  const csvString = "\uFEFF" + lines.join("\r\n");
  return Buffer.from(csvString, "utf8");
}
