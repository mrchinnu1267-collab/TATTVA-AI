import { buildZip, ZipEntry } from "./zip";

export interface DocxSection {
  heading?: string;
  content?: string;
  bullets?: string[];
  table?: (string | number)[][];
}

export interface DocxPayload {
  title: string;
  subtitle?: string;
  author?: string;
  sections?: DocxSection[];
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

/**
 * Builds a 100% valid Microsoft Word (.docx) OpenXML document
 * Opens natively without repair errors in MS Word (Windows/Mac/Android), Google Docs, and LibreOffice.
 */
export function createDocx(payload: DocxPayload): Buffer {
  const title = escapeXml(payload.title || "TATTVA AI Document");
  const subtitle = payload.subtitle ? escapeXml(payload.subtitle) : "";
  const author = escapeXml(payload.author || "TATTVA AI");

  let bodyXml = "";

  // Title
  bodyXml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="48"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>${title}</w:t>
      </w:r>
    </w:p>`;

  // Subtitle
  if (subtitle) {
    bodyXml += `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="0" w:after="360"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            <w:i/>
            <w:sz w:val="24"/>
            <w:color w:val="475569"/>
          </w:rPr>
          <w:t>${subtitle}</w:t>
        </w:r>
      </w:p>`;
  }

  // Sections
  const sections = payload.sections && payload.sections.length > 0
    ? payload.sections
    : [{ heading: "Document Content", content: payload.rawText || "" }];

  for (const sec of sections) {
    if (sec.heading) {
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:spacing w:before="360" w:after="120"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:b/>
              <w:sz w:val="32"/>
              <w:color w:val="1E293B"/>
            </w:rPr>
            <w:t>${escapeXml(sec.heading)}</w:t>
          </w:r>
        </w:p>`;
    }

    if (sec.content) {
      const paragraphs = sec.content.split(/\n\s*\n/);
      for (const p of paragraphs) {
        const trimmed = p.trim();
        if (!trimmed) continue;

        // Check if paragraph is list of bullet points
        const lines = trimmed.split("\n");
        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          const isBullet = cleanLine.startsWith("- ") || cleanLine.startsWith("* ") || cleanLine.startsWith("• ");
          const text = isBullet ? cleanLine.replace(/^[-*•]\s+/, "") : cleanLine;

          bodyXml += `
            <w:p>
              <w:pPr>
                ${isBullet ? '<w:ind w:left="720"/>' : ""}
                <w:spacing w:before="60" w:after="120" w:line="276" w:lineRule="auto"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="22"/>
                  <w:color w:val="334155"/>
                </w:rPr>
                <w:t>${isBullet ? "• " : ""}${escapeXml(text)}</w:t>
              </w:r>
            </w:p>`;
        }
      }
    }

    if (sec.bullets && sec.bullets.length > 0) {
      for (const b of sec.bullets) {
        bodyXml += `
          <w:p>
            <w:pPr>
              <w:ind w:left="720"/>
              <w:spacing w:before="40" w:after="80"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:sz w:val="22"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t>• ${escapeXml(b)}</w:t>
            </w:r>
          </w:p>`;
      }
    }

    if (sec.table && Array.isArray(sec.table) && sec.table.length > 0) {
      bodyXml += `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="5000" w:type="pct"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
              <w:left w:val="none"/>
              <w:bottom w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
              <w:right w:val="none"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
              <w:insideV w:val="none"/>
            </w:tblBorders>
          </w:tblPr>`;

      sec.table.forEach((row, rowIdx) => {
        const isHeader = rowIdx === 0;
        bodyXml += `
          <w:tr>
            <w:trPr>
              ${isHeader ? '<w:tblHeader/>' : ""}
            </w:trPr>`;

        row.forEach((cell) => {
          bodyXml += `
            <w:tc>
              <w:tcPr>
                <w:tcMar>
                  <w:top w:w="120" w:type="dxa"/>
                  <w:left w:w="160" w:type="dxa"/>
                  <w:bottom w:w="120" w:type="dxa"/>
                  <w:right w:w="160" w:type="dxa"/>
                </w:tcMar>
                ${isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>' : ""}
              </w:tcPr>
              <w:p>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    ${isHeader ? "<w:b/>" : ""}
                    <w:sz w:val="20"/>
                    <w:color w:val="${isHeader ? "0F172A" : "334155"}"/>
                  </w:rPr>
                  <w:t>${escapeXml(String(cell))}</w:t>
                </w:r>
              </w:p>
            </w:tc>`;
        });

        bodyXml += `</w:tr>`;
      });

      bodyXml += `</w:tbl>`;
    }
  }

  // Section properties (Letter size, 1 inch margins)
  bodyXml += `
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:color w:val="334155"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

  const nowIso = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:dcmitype="http://purl.org/dc/dcmitype/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${title}</dc:title>
  <dc:creator>${author}</dc:creator>
  <cp:lastModifiedBy>${author}</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>TATTVA AI Intelligence Suite</Application>
  <Company>TATTVA AI</Company>
</Properties>`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: contentTypesXml },
    { name: "_rels/.rels", data: relsXml },
    { name: "docProps/core.xml", data: coreXml },
    { name: "docProps/app.xml", data: appXml },
    { name: "word/_rels/document.xml.rels", data: wordRelsXml },
    { name: "word/document.xml", data: documentXml },
    { name: "word/styles.xml", data: stylesXml },
  ];

  return buildZip(entries);
}

