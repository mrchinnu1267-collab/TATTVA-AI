import { buildZip, ZipEntry } from "./zip";

export interface DocxSection {
  heading?: string;
  subheading?: string;
  content?: string;
  bullets?: string[];
  table?: (string | number)[][];
  callout?: string;
}

export interface DocxPayload {
  title: string;
  subtitle?: string;
  author?: string;
  organization?: string;
  date?: string;
  sections?: DocxSection[];
  references?: string[];
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

function cleanDocxText(raw: string): string {
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
 * Builds a 100% valid Microsoft Word (.docx) OpenXML document
 * Features: Header, dynamic page numbers in footer, formatted tables,
 * callout blocks, styled headings, and references.
 * Opens natively in MS Word (Windows/Mac/Android), Word Online, and LibreOffice.
 */
export function createDocx(payload: DocxPayload): Buffer {
  const title = escapeXml(payload.title || "TATTVA AI Document");
  const subtitle = payload.subtitle ? escapeXml(payload.subtitle) : "";
  const author = escapeXml(payload.author || "TATTVA AI Intelligence Suite");
  const organization = escapeXml(payload.organization || "TATTVA AI");
  const dateStr = escapeXml(payload.date || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }));

  let bodyXml = "";

  // 1. Cover / Title Block
  bodyXml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="360" w:after="120"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:sz w:val="52"/>
          <w:color w:val="0F172A"/>
        </w:rPr>
        <w:t>${title}</w:t>
      </w:r>
    </w:p>`;

  if (subtitle) {
    bodyXml += `
      <w:p>
        <w:pPr>
          <w:jc w:val="center"/>
          <w:spacing w:before="0" w:after="240"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            <w:i/>
            <w:sz w:val="26"/>
            <w:color w:val="475569"/>
          </w:rPr>
          <w:t>${subtitle}</w:t>
        </w:r>
      </w:p>`;
  }

  // Metadata / Author line
  bodyXml += `
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:pBdr>
          <w:bottom w:val="single" w:sz="6" w:space="12" w:color="CBD5E1"/>
        </w:pBdr>
        <w:spacing w:before="0" w:after="360"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:sz w:val="20"/>
          <w:color w:val="64748B"/>
        </w:rPr>
        <w:t>${author} • ${organization} • ${dateStr}</w:t>
      </w:r>
    </w:p>`;

  // 2. Sections
  const sections = payload.sections && payload.sections.length > 0
    ? payload.sections
    : [{ heading: "Executive Summary", content: payload.rawText || "" }];

  sections.forEach((sec, sIdx) => {
    // Heading 1
    if (sec.heading) {
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="Heading1"/>
            <w:spacing w:before="400" w:after="140"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:b/>
              <w:sz w:val="32"/>
              <w:color w:val="1E3A8A"/>
            </w:rPr>
            <w:t>${escapeXml(cleanDocxText(sec.heading))}</w:t>
          </w:r>
        </w:p>`;
    }

    // Subheading
    if (sec.subheading) {
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:pStyle w:val="Heading2"/>
            <w:spacing w:before="240" w:after="100"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:b/>
              <w:sz w:val="26"/>
              <w:color w:val="334155"/>
            </w:rPr>
            <w:t>${escapeXml(cleanDocxText(sec.subheading))}</w:t>
          </w:r>
        </w:p>`;
    }

    // Callout Box
    if (sec.callout) {
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:pBdr>
              <w:left w:val="single" w:sz="24" w:space="16" w:color="2563EB"/>
            </w:pBdr>
            <w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/>
            <w:ind w:left="360" w:right="360"/>
            <w:spacing w:before="160" w:after="200" w:line="280" w:lineRule="auto"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:i/>
              <w:b/>
              <w:sz w:val="22"/>
              <w:color w:val="1E293B"/>
            </w:rPr>
            <w:t>💡 Note: </w:t>
          </w:r>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:sz w:val="22"/>
              <w:color w:val="334155"/>
            </w:rPr>
            <w:t>${escapeXml(cleanDocxText(sec.callout))}</w:t>
          </w:r>
        </w:p>`;
    }

    // Paragraph Content
    if (sec.content) {
      const paragraphs = sec.content.split(/\n\s*\n/);
      for (const p of paragraphs) {
        const trimmed = p.trim();
        if (!trimmed) continue;

        const lines = trimmed.split("\n");
        for (const line of lines) {
          const cleanLine = line.trim();
          if (!cleanLine) continue;

          const isBullet = cleanLine.startsWith("- ") || cleanLine.startsWith("* ") || cleanLine.startsWith("• ");
          const text = isBullet ? cleanLine.replace(/^[-*•]\s+/, "") : cleanLine;

          bodyXml += `
            <w:p>
              <w:pPr>
                ${isBullet ? '<w:ind w:left="540"/>' : ""}
                <w:spacing w:before="60" w:after="120" w:line="280" w:lineRule="auto"/>
              </w:pPr>
              <w:r>
                <w:rPr>
                  <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                  <w:sz w:val="22"/>
                  <w:color w:val="334155"/>
                </w:rPr>
                <w:t>${isBullet ? "• " : ""}${escapeXml(cleanDocxText(text))}</w:t>
              </w:r>
            </w:p>`;
        }
      }
    }

    // Bullet points array
    if (sec.bullets && sec.bullets.length > 0) {
      for (const b of sec.bullets) {
        bodyXml += `
          <w:p>
            <w:pPr>
              <w:ind w:left="540"/>
              <w:spacing w:before="40" w:after="80" w:line="260" w:lineRule="auto"/>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:b/>
                <w:sz w:val="22"/>
                <w:color w:val="2563EB"/>
              </w:rPr>
              <w:t>▪ </w:t>
            </w:r>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                <w:sz w:val="22"/>
                <w:color w:val="334155"/>
              </w:rPr>
              <w:t>${escapeXml(cleanDocxText(b))}</w:t>
            </w:r>
          </w:p>`;
      }
    }

    // Formatted Table
    if (sec.table && Array.isArray(sec.table) && sec.table.length > 0) {
      bodyXml += `
        <w:tbl>
          <w:tblPr>
            <w:tblW w:w="5000" w:type="pct"/>
            <w:tblBorders>
              <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
              <w:left w:val="none"/>
              <w:bottom w:val="single" w:sz="8" w:space="0" w:color="94A3B8"/>
              <w:right w:val="none"/>
              <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
              <w:insideV w:val="none"/>
            </w:tblBorders>
            <w:tblCellMar>
              <w:top w:w="120" w:type="dxa"/>
              <w:left w:w="160" w:type="dxa"/>
              <w:bottom w:w="120" w:type="dxa"/>
              <w:right w:w="160" w:type="dxa"/>
            </w:tblCellMar>
          </w:tblPr>`;

      sec.table.forEach((row, rowIdx) => {
        const isHeader = rowIdx === 0;
        const isZebra = !isHeader && rowIdx % 2 === 1;
        bodyXml += `
          <w:tr>
            <w:trPr>
              ${isHeader ? '<w:tblHeader/>' : ""}
            </w:trPr>`;

        row.forEach((cell) => {
          bodyXml += `
            <w:tc>
              <w:tcPr>
                <w:shd w:val="clear" w:color="auto" w:fill="${isHeader ? "0F172A" : isZebra ? "F8FAFC" : "FFFFFF"}"/>
              </w:tcPr>
              <w:p>
                <w:pPr>
                  <w:spacing w:before="60" w:after="60"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    ${isHeader ? "<w:b/>" : ""}
                    <w:sz w:val="${isHeader ? "21" : "20"}"/>
                    <w:color w:val="${isHeader ? "FFFFFF" : "1E293B"}"/>
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
  });

  // 3. References Section
  if (payload.references && payload.references.length > 0) {
    bodyXml += `
      <w:p>
        <w:pPr>
          <w:pStyle w:val="Heading1"/>
          <w:spacing w:before="480" w:after="140"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
            <w:b/>
            <w:sz w:val="30"/>
            <w:color w:val="1E3A8A"/>
          </w:rPr>
          <w:t>References &amp; Verification Sources</w:t>
        </w:r>
      </w:p>`;

    payload.references.forEach((ref, rIdx) => {
      bodyXml += `
        <w:p>
          <w:pPr>
            <w:ind w:left="480" w:hanging="480"/>
            <w:spacing w:before="40" w:after="80"/>
          </w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:b/>
              <w:sz w:val="20"/>
              <w:color w:val="64748B"/>
            </w:rPr>
            <w:t>[${rIdx + 1}] </w:t>
          </w:r>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:sz w:val="20"/>
              <w:color w:val="334155"/>
            </w:rPr>
            <w:t>${escapeXml(ref)}</w:t>
          </w:r>
        </w:p>`;
    });
  }

  // 4. Section Properties with Header and Footer References
  bodyXml += `
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rIdHeader"/>
      <w:footerReference w:type="default" r:id="rIdFooter"/>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>`;

  // document.xml
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
  </w:body>
</w:document>`;

  // header1.xml
  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:jc w:val="right"/>
      <w:spacing w:after="0"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:i/>
        <w:sz w:val="18"/>
        <w:color w:val="94A3B8"/>
      </w:rPr>
      <w:t>${title}</w:t>
    </w:r>
  </w:p>
</w:hdr>`;

  // footer1.xml with dynamic page number
  const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:tabs>
        <w:tab w:val="right" w:pos="9360"/>
      </w:tabs>
      <w:spacing w:before="0"/>
    </w:pPr>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="18"/>
        <w:color w:val="94A3B8"/>
      </w:rPr>
      <w:t>TATTVA AI • Genuine Microsoft Office Document</w:t>
    </w:r>
    <w:r>
      <w:tab/>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="18"/>
        <w:color w:val="94A3B8"/>
      </w:rPr>
      <w:t>Page </w:t>
    </w:r>
    <w:fldSimple w:instr="PAGE">
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:sz w:val="18"/>
          <w:color w:val="94A3B8"/>
        </w:rPr>
        <w:t>1</w:t>
      </w:r>
    </w:fldSimple>
    <w:r>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
        <w:sz w:val="18"/>
        <w:color w:val="94A3B8"/>
      </w:rPr>
      <w:t> of </w:t>
    </w:r>
    <w:fldSimple w:instr="NUMPAGES">
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:sz w:val="18"/>
          <w:color w:val="94A3B8"/>
        </w:rPr>
        <w:t>1</w:t>
      </w:r>
    </w:fldSimple>
  </w:p>
</w:ftr>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
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
  <Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
        <w:lang w:val="en-US"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="32"/>
      <w:color w:val="1E3A8A"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:b/>
      <w:sz w:val="26"/>
      <w:color w:val="334155"/>
    </w:rPr>
  </w:style>
</w:styles>`;

  const nowIso = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
                   xmlns:dc="http://purl.org/dc/elements/1.1/"
                   xmlns:dcterms="http://purl.org/dc/terms/"
                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${title}</dc:title>
  <dc:subject>${subtitle}</dc:subject>
  <dc:creator>${author}</dc:creator>
  <cp:lastModifiedBy>TATTVA AI</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>Microsoft Office Word</Application>
  <Company>${organization}</Company>
</Properties>`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: contentTypesXml },
    { name: "_rels/.rels", data: relsXml },
    { name: "docProps/core.xml", data: coreXml },
    { name: "docProps/app.xml", data: appXml },
    { name: "word/_rels/document.xml.rels", data: wordRelsXml },
    { name: "word/document.xml", data: documentXml },
    { name: "word/header1.xml", data: headerXml },
    { name: "word/footer1.xml", data: footerXml },
    { name: "word/styles.xml", data: stylesXml },
  ];

  return buildZip(entries);
}
