import { NextResponse } from "next/server";
import { generateDocxWithPython, generateXlsxWithPython, generatePptxWithPython, generatePdfWithPython } from "../../../lib/document-engine/python-bridge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { format, title, content, data } = body;

    const safeTitle = (title || "Document").replace(/[^a-zA-Z0-9_-]/g, "_");

    if (format === "docx") {
      const res = await generateDocxWithPython({
        title: title || "Document",
        content: typeof content === "string" ? content : content?.html || JSON.stringify(content, null, 2),
      });
      if (res.success && res.base64) {
        return NextResponse.json({
          success: true,
          filename: `${safeTitle}.docx`,
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          dataUri: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${res.base64}`,
        });
      }
    } else if (format === "xlsx") {
      const rows = data?.rows || content?.sheets?.[0]?.rows || [["Item", "Value"], ["Sample", 100]];
      const res = await generateXlsxWithPython({
        title: title || "Spreadsheet",
        rows,
      });
      if (res.success && res.base64) {
        return NextResponse.json({
          success: true,
          filename: `${safeTitle}.xlsx`,
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dataUri: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${res.base64}`,
        });
      }
    } else if (format === "pptx") {
      const slides = content?.slides || [
        { title: title || "Presentation", category: "OVERVIEW", bullets: ["Key Concept 1", "Key Concept 2"] },
      ];
      const res = await generatePptxWithPython({
        title: title || "Presentation",
        slides,
      });
      if (res.success && res.base64) {
        return NextResponse.json({
          success: true,
          filename: `${safeTitle}.pptx`,
          mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          dataUri: `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${res.base64}`,
        });
      }
    } else if (format === "pdf") {
      const res = await generatePdfWithPython({
        title: title || "Document",
        content: typeof content === "string" ? content : content?.html || JSON.stringify(content, null, 2),
      });
      if (res.success && res.base64) {
        return NextResponse.json({
          success: true,
          filename: `${safeTitle}.pdf`,
          mimeType: "application/pdf",
          dataUri: `data:application/pdf;base64,${res.base64}`,
        });
      }
    } else if (format === "csv") {
      const rows = data?.rows || content?.sheets?.[0]?.rows || [["Item", "Value"], ["Sample", 100]];
      const csvStr = rows.map((r: any[]) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const base64 = Buffer.from(csvStr, "utf-8").toString("base64");
      return NextResponse.json({
        success: true,
        filename: `${safeTitle}.csv`,
        mimeType: "text/csv",
        dataUri: `data:text/csv;base64,${base64}`,
      });
    } else if (format === "txt") {
      const text = typeof content === "string" ? content : content?.html ? content.html.replace(/<[^>]+>/g, " ") : JSON.stringify(content, null, 2);
      const base64 = Buffer.from(text, "utf-8").toString("base64");
      return NextResponse.json({
        success: true,
        filename: `${safeTitle}.txt`,
        mimeType: "text/plain",
        dataUri: `data:text/plain;base64,${base64}`,
      });
    } else if (format === "json") {
      const jsonStr = JSON.stringify(content || data || {}, null, 2);
      const base64 = Buffer.from(jsonStr, "utf-8").toString("base64");
      return NextResponse.json({
        success: true,
        filename: `${safeTitle}.json`,
        mimeType: "application/json",
        dataUri: `data:application/json;base64,${base64}`,
      });
    }

    return NextResponse.json({ error: `Unsupported format: ${format}` }, { status: 400 });
  } catch (err: any) {
    console.error("[Workspace Export API] Error:", err);
    return NextResponse.json({ error: err.message || "Export compilation failed" }, { status: 500 });
  }
}
