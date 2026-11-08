import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { buildDocument, SupportedDocumentFormat } from "../../lib/document-engine";

export const runtime = "nodejs";

const LOCAL_ENGINE_URL = process.env.LOCAL_DOCUMENT_ENGINE_URL || "http://127.0.0.1:8000";

interface DocumentGeneratePayload {
  prompt: string;
  format: "pdf" | "docx" | "pptx" | "xlsx" | "csv" | "txt" | "md" | "json";
  title?: string;
  subtitle?: string;
}

export async function POST(request: Request) {
  try {
    const body: DocumentGeneratePayload = await request.json().catch(() => null);
    if (!body || !body.prompt || body.prompt.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Please describe the document you want to generate." },
        { status: 400 }
      );
    }

    const rawPrompt = body.prompt.trim();
    const format = (body.format || "pdf").toLowerCase() as SupportedDocumentFormat;
    const apiKey = process.env.GEMINI_API_KEY;

    let structuredData: any = {
      title: body.title || "TATTVA AI Generated Document",
      subtitle: body.subtitle || "Professional Document Suite",
      sections: [],
      slides: [],
      sheets: [],
      data: [],
      content: "",
    };

    // 1. AI Content Generation & Logical Structure using Gemini
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemPrompt = `You are the master Document Architect for TATTVA AI Document Engine.
Analyze the user request and generate highly detailed, professional, structured document content for format "${format.toUpperCase()}".

REQUIREMENTS FOR FORMAT "${format.toUpperCase()}":
- If "pdf" or "docx":
  Return a clear document title, subtitle, and 3-6 comprehensive sections. Each section must have a "heading", professional "content" (with paragraphs and bullet points), and optional "table" (2D array of strings/numbers).
- If "pptx":
  Return a presentation title, subtitle, and 4-8 slide objects. Each slide must have a "title" and 3-5 concise, impactful "bullets".
- If "xlsx":
  Return 1-3 sheet objects. Each sheet must have "title", a 2D array of "rows" with header and structured rows (financials, analytics, metrics, inventory).
- If "csv":
  Return a 2D array "data" where row 0 is column headers, followed by 5-15 rows of realistic tabular data.
- If "txt" or "md":
  Return a comprehensive markdown/text string in "content" with headers, bullet points, and tables.

Return a valid JSON object with this structure:
{
  "title": string,
  "subtitle": string,
  "sections": [{"heading": string, "content": string, "table": [[]]}],
  "slides": [{"title": string, "bullets": [string]}],
  "sheets": [{"title": string, "rows": [[]]}],
  "data": [[]],
  "content": string,
  "summary": string
}`;

        const res = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ text: `USER REQUEST:\n"${rawPrompt}"` }],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        });

        const parsed = JSON.parse(res.text || "{}");
        if (parsed.title) structuredData.title = parsed.title;
        if (parsed.subtitle) structuredData.subtitle = parsed.subtitle;
        if (parsed.sections) structuredData.sections = parsed.sections;
        if (parsed.slides) structuredData.slides = parsed.slides;
        if (parsed.sheets) structuredData.sheets = parsed.sheets;
        if (parsed.data) structuredData.data = parsed.data;
        if (parsed.content) structuredData.content = parsed.content;
      } catch (geminiError) {
        console.warn("AI document structuring fallback to raw content:", geminiError);
        structuredData.title = rawPrompt.slice(0, 40);
        structuredData.sections = [{ heading: "Summary", content: rawPrompt }];
      }
    }

    // 2. Check if external specialized python document engine is running
    try {
      const pyRes = await fetch(`${LOCAL_ENGINE_URL}/generate-document`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          title: structuredData.title,
          subtitle: structuredData.subtitle,
          sections: structuredData.sections,
          slides: structuredData.slides,
          sheets: structuredData.sheets,
          data: structuredData.data,
          content: structuredData.content,
        }),
        signal: AbortSignal.timeout(3000),
      });

      if (pyRes.ok) {
        const pyData = await pyRes.json();
        if (pyData?.success && pyData.data_uri) {
          return NextResponse.json({
            success: true,
            filename: pyData.filename,
            format: pyData.format,
            mime_type: pyData.mime_type,
            size_bytes: pyData.size_bytes,
            data_uri: pyData.data_uri,
            structured_data: structuredData,
            title: structuredData.title,
          });
        }
      }
    } catch {
      // Local engine not running - proceed with built-in master document engine
    }

    // 3. Built-In Master Document Engine (100% compliant OpenXML / PDF 1.4 binary)
    const result = buildDocument({
      format,
      title: structuredData.title,
      subtitle: structuredData.subtitle,
      sections: structuredData.sections,
      slides: structuredData.slides,
      sheets: structuredData.sheets,
      data: structuredData.data,
      content: structuredData.content || rawPrompt,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to generate document binary.");
    }

    return NextResponse.json({
      success: true,
      filename: result.filename,
      format: result.format,
      mime_type: result.mimeType,
      size_bytes: result.sizeBytes,
      data_uri: result.dataUri,
      structured_data: structuredData,
      title: structuredData.title,
    });
  } catch (error: unknown) {
    console.error("Document generate API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Document generation failed." },
      { status: 500 }
    );
  }
}
