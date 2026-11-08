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
 * Builds a 100% genuine Microsoft Excel (.xlsx) OpenXML workbook
 * Features:
 * - Dynamic column widths tailored to content
 * - Native Excel formula evaluation support (=SUM, =AVERAGE, etc.)
 * - Styled header row with dark fill (#0F172A) & crisp white text
 * - Alternating zebra striping (#F8FAFC) on data rows
 * - Auto-filters on header row
 * - 100% compatible with MS Excel (Office 365, 2021, 2019, Android), Google Sheets, LibreOffice
 */
export function createXlsx(payload: SpreadsheetPayload): Buffer {
  const workbookTitle = escapeXml(payload.title || "TATTVA AI Spreadsheet");

  let sheets: SpreadsheetSheet[] = [];
  if (payload.sheets && payload.sheets.length > 0) {
    sheets = payload.sheets;
  } else if (payload.data && payload.data.length > 0) {
    sheets = [{ title: "Sheet1", rows: payload.data }];
  } else if (payload.rawText) {
    const rows = payload.rawText
      .trim()
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
          return trimmed
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim())
            .filter((_, idx, arr) => !arr.every((cell) => /^[-:]+$/.test(cell)));
        }
        return trimmed.split(/,|\t/).map((c) => c.trim());
      })
      .filter((r) => r.length > 0 && !r.every((c) => /^[-:]+$/.test(c)));

    sheets = [{ title: "Sheet1", rows }];
  } else {
    sheets = [{ title: "Sheet1", rows: [["No Data Available"]] }];
  }

  const sheetEntries: ZipEntry[] = [];
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

    // 1. Calculate optimal column widths
    const maxColIndex = sheet.rows.reduce((max, row) => Math.max(max, row.length), 0);
    const colWidths: number[] = new Array(maxColIndex).fill(12);

    sheet.rows.forEach((row) => {
      row.forEach((cellVal, colIdx) => {
        if (cellVal !== null && cellVal !== undefined) {
          const strLen = String(cellVal).length;
          colWidths[colIdx] = Math.min(45, Math.max(colWidths[colIdx], strLen + 4));
        }
      });
    });

    let colsXml = "<cols>";
    colWidths.forEach((width, idx) => {
      colsXml += `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`;
    });
    colsXml += "</cols>";

    // 2. Build rows XML
    let sheetRowsXml = "";
    sheet.rows.forEach((row, rowIdx) => {
      const rowNum = rowIdx + 1;
      const isHeader = rowIdx === 0;
      const isEvenRow = rowIdx % 2 === 0;
      let rowCellsXml = "";

      row.forEach((cellVal, colIdx) => {
        const colLetter = getColumnLetter(colIdx);
        const cellRef = `${colLetter}${rowNum}`;

        if (cellVal === null || cellVal === undefined || cellVal === "") {
          return;
        }

        const cellStr = String(cellVal).trim();

        // Formula Detection: e.g. =SUM(B2:B10) or =AVERAGE(C2:C10)
        if (cellStr.startsWith("=") && cellStr.length > 1) {
          const formula = escapeXml(cellStr.slice(1));
          // Style 4: Formula / Summary style (bold text with border)
          rowCellsXml += `<c r="${cellRef}" s="4"><f>${formula}</f></c>`;
          return;
        }

        const isNum = typeof cellVal === "number" || (!isNaN(Number(cellVal)) && !cellStr.startsWith("0") && !cellStr.includes("-") && !cellStr.includes("/"));

        if (isHeader) {
          // Style 1: Header row (Dark Navy #0F172A, Bold White Text)
          const escaped = escapeXml(cellStr);
          rowCellsXml += `<c r="${cellRef}" t="inlineStr" s="1"><is><t>${escaped}</t></is></c>`;
        } else if (isNum) {
          // Style 2: Number with standard border; Style 3: Number with zebra row
          const styleId = isEvenRow ? 3 : 2;
          const numVal = typeof cellVal === "number" ? cellVal : Number(cellVal);
          rowCellsXml += `<c r="${cellRef}" s="${styleId}"><v>${numVal}</v></c>`;
        } else {
          // Style 0: Standard text; Style 5: Zebra text
          const styleId = isEvenRow ? 5 : 0;
          const escaped = escapeXml(cellStr);
          rowCellsXml += `<c r="${cellRef}" t="inlineStr" s="${styleId}"><is><t>${escaped}</t></is></c>`;
        }
      });

      if (rowCellsXml) {
        sheetRowsXml += `<row r="${rowNum}" ${isHeader ? 'ht="24" customHeight="1"' : 'ht="19" customHeight="1"'}>${rowCellsXml}</row>`;
      }
    });

    // Auto-filter on header
    const lastColLetter = getColumnLetter(Math.max(0, maxColIndex - 1));
    const totalRowsCount = sheet.rows.length;
    const autoFilterXml = totalRowsCount > 1
      ? `<autoFilter ref="A1:${lastColLetter}${totalRowsCount}"/>`
      : "";

    const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews>
    <sheetView tabSelected="${sheetIdx === 0 ? "1" : "0"}" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="19"/>
  ${colsXml}
  <sheetData>
    ${sheetRowsXml}
  </sheetData>
  ${autoFilterXml}
</worksheet>`;

    sheetEntries.push({
      name: `xl/worksheets/sheet${sheetId}.xml`,
      data: worksheetXml,
    });
  });

  // Stylesheet: Header (navy + white), numbers, zebra rows (#F8FAFC), borders
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font>
      <sz val="10.5"/>
      <name val="Calibri"/>
      <color rgb="FF0F172A"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
      <color rgb="FFFFFFFF"/>
    </font>
    <font>
      <b/>
      <sz val="10.5"/>
      <name val="Calibri"/>
      <color rgb="FF0F172A"/>
    </font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF8FAFC"/></patternFill></fill>
  </fills>
  <borders count="3">
    <border><left/><right/><top/><bottom/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FF94A3B8"/></left>
      <right style="thin"><color rgb="FF94A3B8"/></right>
      <top style="thin"><color rgb="FF94A3B8"/></top>
      <bottom style="double"><color rgb="FF0F172A"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="6">
    <!-- 0: Regular text with border -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
    <!-- 1: Header (Dark navy fill, bold white text) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1">
      <alignment horizontal="center" vertical="center"/>
    </xf>
    <!-- 2: Regular number with border -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 3: Number on zebra row (#F8FAFC) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 4: Formula / Summary total (Bold, double bottom border) -->
    <xf numFmtId="0" fontId="2" fillId="0" borderId="2" xfId="0" applyFont="1" applyBorder="1">
      <alignment horizontal="right" vertical="center"/>
    </xf>
    <!-- 5: Text on zebra row (#F8FAFC) -->
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1">
      <alignment vertical="center"/>
    </xf>
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
  <dc:creator>TATTVA AI Intelligence Suite</dc:creator>
  <cp:lastModifiedBy>TATTVA AI</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Microsoft Office Excel</Application>
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

  // OPC REQUIREMENT: [Content_Types].xml MUST be entry #1, _rels/.rels MUST be entry #2
  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: contentTypesXml },
    { name: "_rels/.rels", data: relsXml },
    { name: "docProps/core.xml", data: coreXml },
    { name: "docProps/app.xml", data: appXml },
    { name: "xl/_rels/workbook.xml.rels", data: xlRelsXml },
    { name: "xl/workbook.xml", data: workbookXml },
    { name: "xl/styles.xml", data: stylesXml },
    ...sheetEntries,
  ];

  return buildZip(entries);
}
