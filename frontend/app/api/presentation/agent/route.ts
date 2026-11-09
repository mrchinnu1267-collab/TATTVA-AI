import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { verifyUserSession, checkRateLimit } from "../../../lib/security";
import { PRESENTATION_AI_TOOLS } from "../../../components/presentation-studio/ai-tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM_INSTRUCTION = `You are TATTVA AI PowerPoint Presentation Agent, an expert presentation designer and executive author.
You directly control and manipulate the interactive PowerPoint presentation editor.
When the user gives an instruction:
1. Carefully analyze what they want to achieve (e.g., creating a presentation, inserting diagrams, styling text, adding slides, changing themes, adding tables).
2. Choose the appropriate tool calls from the available tools.
3. ALWAYS return valid tool calls with accurate, topic-specific content. Do NOT use fake filler or repetitive placeholder text.
4. If creating slides, generate clear, professional, substantive bullet points that directly address the user's topic.
5. If the user asks for diagrams, use add_process_diagram or add_shape with proper steps.
6. Provide a concise, professional explanation of the actions taken.`;

export async function POST(request: Request) {
  try {
    const session = await verifyUserSession(request);
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`pres_agent_${session.userId}_${clientIp}`, 40, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ success: false, error: "Rate limit reached. Please wait a moment." }, { status: 429 });
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.command) {
      return NextResponse.json({ success: false, error: "Missing command prompt." }, { status: 400 });
    }

    const { command, presentation, currentSlideNumber = 1 } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format current presentation state context for the model
    const slideSummaries = (presentation?.slides || []).map((s: any, idx: number) => ({
      slideNumber: idx + 1,
      title: s.title,
      category: s.category,
      bulletCount: s.bullets?.length || 0,
      elementCount: s.elements?.length || 0,
    }));

    const contextPayload = {
      presentationTitle: presentation?.title || "Untitled",
      totalSlides: presentation?.slides?.length || 0,
      currentSlideNumber,
      activeTheme: presentation?.theme?.id || "dark_modern",
      slides: slideSummaries,
      userInstruction: command,
    };

    // Format tools for Gemini SDK
    const functionDeclarations = PRESENTATION_AI_TOOLS.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    let modelResponse: any = null;
    const modelCandidates = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-2.5-flash"];

    for (const model of modelCandidates) {
      try {
        modelResponse = await ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${SYSTEM_INSTRUCTION}\n\nCURRENT PRESENTATION STATE:\n${JSON.stringify(
                    contextPayload,
                    null,
                    2
                  )}\n\nUSER COMMAND: "${command}"\n\nPlease execute the required operations by calling the appropriate tools.`,
                },
              ],
            },
          ],
          config: {
            tools: [{ functionDeclarations: functionDeclarations as any }],
            temperature: 0.2,
          },
        });
        if (modelResponse) break;
      } catch (err: any) {
        console.warn(`[Presentation Agent] Model ${model} failed, trying fallback:`, err.message);
      }
    }

    if (!modelResponse) {
      throw new Error("Gemini AI agent was unable to process the presentation command.");
    }

    // Extract tool calls from response
    const steps: Array<{ tool: string; args: any; message: string }> = [];
    let assistantReply = "";

    const candidate = modelResponse.candidates?.[0];
    if (candidate && candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.functionCall) {
          const fn = part.functionCall;
          steps.push({
            tool: fn.name,
            args: fn.args || {},
            message: `Invoking ${fn.name}`,
          });
        } else if (part.text) {
          assistantReply += part.text;
        }
      }
    }

    // Fallback if model answered with text instead of direct tool call
    if (steps.length === 0) {
      const lower = command.toLowerCase();
      if (lower.includes("slide") && (lower.includes("create") || lower.includes("add") || lower.includes("generate"))) {
        steps.push({
          tool: "create_slide",
          args: {
            title: command.replace(/create|add|generate|slide/gi, "").trim() || "New AI Slide",
            category: "ANALYSIS",
            bullets: [
              "Systematic operational mechanism and architecture.",
              "Domain-specific principles and formal verification.",
              "Verifiable execution workflows.",
            ],
            notes: "Speaker notes generated by TATTVA AI Assistant.",
          },
          message: "Created slide based on your instruction.",
        });
      } else if (lower.includes("theme")) {
        const themeId = lower.includes("white")
          ? "professional_white"
          : lower.includes("blue")
          ? "corporate_blue"
          : lower.includes("black")
          ? "minimal_black"
          : lower.includes("tech")
          ? "technology"
          : "dark_modern";
        steps.push({
          tool: "apply_theme",
          args: { theme_id: themeId },
          message: `Applied theme ${themeId}.`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      steps,
      reply: assistantReply.trim() || `Processed command: "${command}". Executed ${steps.length} operation(s).`,
    });
  } catch (error: any) {
    console.error("[Presentation Agent API] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process presentation command." },
      { status: 500 }
    );
  }
}

