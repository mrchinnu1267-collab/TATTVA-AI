import { buildZip, ZipEntry } from "./zip";

export interface SpreadsheetSheet {
  title?: string;
  name?: string;
  rows: (string | number | boolean | null | undefined)[][];
  formulas?: { cell: string; formula: string }[];
}

export interface SpreadsheetPayload {
  title?: string;
  sheets?: SpreadsheetSheet[];
  data?: (string | number | boolean | null | undefined)[][];
  rawText?: string;
}

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getColumnLetter(colIndex: number): string {
  let temp = colIndex + 1;
  let letter = "";
  while (temp > 0) {
    const mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Builds a 100% valid Microsoft Excel (.xlsx) OpenXML workbook
 * Opens natively without corruption warnings in Excel (Windows/Mac/Android), Google Sheets, LibreOffice
 */
export function createXlsx(payload: SpreadsheetPayload): Buffer {
  const workbookTitle = escapeXml(payload.title || "TATTVA AI Spreadsheet");

  let sheets: SpreadsheetSheet[] = [];
  if (payload.sheets && payload.sheets.length > 0) {
    sheets = payload.sheets;
  } else if (payload.data && payload.data.length > 0) {
    sheets = [{ title: "Sheet1", rows: payload.data }];
  } else if (payload.rawText) {
    // Parse tabular lines from markdown or CSV
    const rows = payload.rawText
      .trim()
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          // Markdown table row
          return trimmed
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
            .filter((_, idx, arr) => !arr.every((cell) => /^[-:]+$/.test(cell))); // skip separator
        }
        return trimmed.split(/,|\t/).map((c) => c.trim());
      })
      .filter((r) => r.length > 0 && !r.every((c) => /^[-:]+$/.test(c)));

    sheets = [{ title: "Sheet1", rows }];
  } else {
    sheets = [{ title: "Sheet1", rows: [["No Data Available"]] }];
  }

  const entries: ZipEntry[] = [];
  let workbookSheetsXml = "";
  let workbookRelsXml = "";
  let contentTypesOverrideXml = "";

  sheets.forEach((sheet, sheetIdx) => {
    const sheetId = sheetIdx + 1;
    const sheetName = escapeXml(sheet.title || sheet.name || `Sheet${sheetId}`).slice(0, 31);
    const relId = `rId${sheetId}`;

    workbookSheetsXml += `<sheet name="${sheetName}" sheetId="${sheetId}" r:id="${relId}"/>`;
    workbookRelsXml += `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sheetId}.xml"/>`;
    contentTypesOverrideXml += `<Override PartName="/xl/worksheets/sheet${sheetId}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;

    // Build worksheet XML
    let sheetRowsXml = "";
    sheet.rows.forEach((row, rowIdx) => {
      const rowNum = rowIdx + 1;
      const isHeader = rowIdx === 0;
      let rowCellsXml = "";

      row.forEach((cellVal, colIdx) => {
        const colLetter = getColumnLetter(colIdx);
        const cellRef = `${colLetter}${rowNum}`;

        if (cellVal === null || cellVal === undefined || cellVal === "") {
          return;
        }

        const isNum = typeof cellVal === "number" || (!isNaN(Number(cellVal)) && cellVal.toString().trim() !== "");

        if (isNum && typeof cellVal === "number") {
          rowCellsXml += `<c r="${cellRef}" s="${isHeader ? 1 : 2}"><v>${cellVal}</v></c>`;
        } else if (isNum && !isNaN(Number(cellVal)) && !cellVal.toString().startsWith("0") && !cellVal.toString().includes("-")) {
          rowCellsXml += `<c r="${cellRef}" s="${isHeader ? 1 : 2}"><v>${Number(cellVal)}</v></c>`;
        } else {
          const str = escapeXml(String(cellVal));
          rowCellsXml += `<c r="${cellRef}" t="inlineStr" s="${isHeader ? 1 : 0}"><is><t>${str}</t></is></c>`;
        }
      });

      if (rowCellsXml) {
        sheetRowsXml += `<row r="${rowNum}">${rowCellsXml}</row>`;
      }
    });

    const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView tabSelected="${sheetIdx === 0 ? "1" : "0"}" workbookViewId="0"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <sheetData>
    ${sheetRowsXml}
  </sheetData>
</worksheet>`;

    entries.push({
      name: `xl/worksheets/sheet${sheetId}.xml`,
      data: worksheetXml,
    });
  });

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font>
      <sz val="11"/>
      <name val="Calibri"/>
      <color rgb="FF0F172A"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
      <color rgb="FFFFFFFF"/>
    </font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${workbookSheetsXml}
  </sheets>
</workbook>`;

  const nowIso = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${workbookTitle}</dc:title>
  <dc:creator>TATTVA AI</dc:creator>
  <cp:lastModifiedBy>TATTVA AI</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>TATTVA AI Intelligence Suite</Application>
  <Company>TATTVA AI</Company>
</Properties>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  ${contentTypesOverrideXml}
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const xlRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${workbookRelsXml}
  <Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  entries.push(
    { name: "[Content_Types].xml", data: contentTypesXml },
    { name: "_rels/.rels", data: relsXml },
    { name: "docProps/core.xml", data: coreXml },
    { name: "docProps/app.xml", data: appXml },
    { name: "xl/_rels/workbook.xml.rels", data: xlRelsXml },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/styles.xml", data: stylesXml }
  );

  return buildZip(entries);
}

