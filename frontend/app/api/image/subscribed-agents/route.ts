import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { StorageService } from "@/app/lib/image-engine/services/storage.service";
import { verifyUserSession, checkRateLimit } from "@/app/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type ImageIntentCategory =
  | "poster"
  | "logo"
  | "advertising"
  | "photorealistic"
  | "illustration"
  | "variations";

export interface SubscribedAgentConfig {
  id: "agent_a" | "agent_b";
  displayName: string;
  connectionMode: "user_assisted" | "mcp" | "webhook" | "oauth";
  isConnected: boolean;
  mcpServerName?: string;
  webhookUrl?: string;
  notes: string;
}

// In-memory runtime agent configuration (defaults to compliant zero-API-key user-assisted mode)
let runtimeAgentConfig: {
  agent_a: SubscribedAgentConfig;
  agent_b: SubscribedAgentConfig;
} = {
  agent_a: {
    id: "agent_a",
    displayName: "Image Agent A",
    connectionMode: "user_assisted",
    isConnected: true,
    notes: "Operating in zero-API-key compliant mode. Prompts optimized for photorealistic & cinematic rendering.",
  },
  agent_b: {
    id: "agent_b",
    displayName: "Image Agent B",
    connectionMode: "user_assisted",
    isConnected: true,
    notes: "Operating in zero-API-key compliant mode. Prompts optimized for graphic design, posters & illustrations.",
  },
};

/**
 * Optimizes user prompt for Agent A and Agent B syntax without requiring external API keys.
 */
function compileOptimizedPrompts(
  rawPrompt: string,
  category: ImageIntentCategory = "photorealistic",
  aspectRatio: string = "1:1"
) {
  const cleanPrompt = rawPrompt.trim();

  // Agent A Optimizer: Focuses on photorealism, physical lighting, depth of field, and camera physics
  let agentAPrompt = cleanPrompt;
  let agentBPrompt = cleanPrompt;

  switch (category) {
    case "poster":
      agentAPrompt = `${cleanPrompt}, modern cinematic film poster aesthetic, dynamic volumetric lighting, dramatic depth, high-contrast, professional art direction`;
      agentBPrompt = `${cleanPrompt}, award-winning graphic poster design, bold layout, clean typography hierarchy, crisp visual composition, screen-printed vector aesthetic`;
      break;

    case "logo":
      agentAPrompt = `${cleanPrompt}, premium modern brand insignia, 3D embossed metallic finish, soft studio shadows, elegant minimalism, luxury brand identity`;
      agentBPrompt = `${cleanPrompt}, modern flat vector logo, clean iconic emblem, geometric balance, negative space mastery, scalable vector branding`;
      break;

    case "advertising":
      agentAPrompt = `${cleanPrompt}, commercial product advertisement photography, 85mm f/1.4 lens, softbox studio illumination, glossy reflections, editorial quality`;
      agentBPrompt = `${cleanPrompt}, high-impact marketing hero asset, vibrant commercial visual, lifestyle advertising composition, striking color harmony`;
      break;

    case "illustration":
      agentAPrompt = `${cleanPrompt}, rich digital matte painting, painterly textures, atmospheric haze, expressive brushwork, intricate storybook concept art`;
      agentBPrompt = `${cleanPrompt}, modern editorial digital illustration, clean line art, contemporary pastel palette, stylized shapes, elegant character design`;
      break;

    case "variations":
      agentAPrompt = `${cleanPrompt}, alternative creative lighting angle, enhanced cinematic atmosphere, dramatic color grading`;
      agentBPrompt = `${cleanPrompt}, stylized stylistic variation, bold graphic interpretation, experimental composition`;
      break;

    case "photorealistic":
    default:
      agentAPrompt = `${cleanPrompt}, authentic photorealistic capture, shot on Hasselblad H6D-100c, natural skin textures, hyper-detailed ambient occlusion, 8k resolution, raw photo`;
      agentBPrompt = `${cleanPrompt}, masterfully balanced studio portrait, lifelike textures, diffused global illumination, realistic color accuracy, sharp focus`;
      break;
  }

  // Format aspect ratio parameter syntax for prompt copying
  let arSuffix = "";
  if (aspectRatio === "16:9") arSuffix = " --ar 16:9";
  else if (aspectRatio === "9:16") arSuffix = " --ar 9:16";
  else if (aspectRatio === "4:3") arSuffix = " --ar 4:3";
  else if (aspectRatio === "3:4") arSuffix = " --ar 3:4";

  return {
    category,
    aspectRatio,
    agentA: {
      prompt: `${agentAPrompt}${arSuffix}`,
      focus: "Cinematic, Photorealistic & Depth Emphasis",
      tips: "Optimized for natural materials, lighting realism, and high dynamic range.",
    },
    agentB: {
      prompt: `${agentBPrompt}${arSuffix}`,
      focus: "Graphic Layout, Stylization & Composition",
      tips: "Optimized for graphic clarity, typography balance, and clean visual identity.",
    },
  };
}

/**
 * Validates raw image buffer / data URI.
 */
async function validateImagePayload(dataUriOrBase64: string) {
  let buffer: Buffer;
  let cleanData = dataUriOrBase64.trim();

  if (cleanData.startsWith("data:")) {
    const commaIndex = cleanData.indexOf(",");
    if (commaIndex === -1) {
      throw new Error("Invalid image data URI: missing comma separator.");
    }
    const base64Str = cleanData.slice(commaIndex + 1);
    buffer = Buffer.from(base64Str, "base64");
  } else {
    buffer = Buffer.from(cleanData, "base64");
  }

  if (buffer.length === 0) {
    throw new Error("Image payload is empty.");
  }

  if (buffer.length > 25 * 1024 * 1024) {
    throw new Error("Image exceeds maximum permitted size of 25MB.");
  }

  const meta = await sharp(buffer).metadata();
  if (!meta.format || !meta.width || !meta.height) {
    throw new Error("Could not parse image header or dimensions.");
  }

  const supportedFormats = ["jpeg", "png", "webp", "avif", "gif"];
  if (!supportedFormats.includes(meta.format)) {
    throw new Error(
      `Unsupported image format: ${meta.format}. Please provide JPEG, PNG, or WebP.`
    );
  }

  return {
    valid: true,
    buffer,
    format: meta.format,
    width: meta.width,
    height: meta.height,
    aspectRatio: (meta.width / meta.height).toFixed(2),
    fileSizeBytes: buffer.length,
  };
}

/**
 * GET: Retrieve configuration and connection status for Image Agent A and B.
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    agents: runtimeAgentConfig,
    policy: {
      requiresApiKeys: false,
      usesZeroApiKeys: true,
      supportedModes: ["user_assisted", "mcp", "webhook", "oauth"],
      security: {
        credentialStorage: "none",
        cookieExtraction: "forbidden",
        captchaBypass: "forbidden",
      },
    },
  });
}

/**
 * POST: Multi-action coordinator for Subscribed Image Agents.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await verifyUserSession(req);
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";

    const rateCheck = checkRateLimit(`sub_agents_${session.userId}_${clientIp}`, 30, 60_000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Rate limit reached. Please wait ${rateCheck.resetSeconds}s.` },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body.action !== "string") {
      return NextResponse.json(
        { error: "Valid 'action' parameter is required." },
        { status: 400 }
      );
    }

    // ACTION 1: Optimize Prompts (Zero API Keys)
    if (body.action === "optimize_prompts") {
      const { prompt, category = "photorealistic", aspectRatio = "1:1" } = body;
      if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        return NextResponse.json({ error: "A prompt string is required." }, { status: 400 });
      }

      const compiled = compileOptimizedPrompts(prompt, category, aspectRatio);
      return NextResponse.json({
        success: true,
        action: "optimize_prompts",
        originalPrompt: prompt.trim(),
        optimized: compiled,
      });
    }

    // ACTION 2: Validate & Persist Uploaded / Returned Image
    if (body.action === "validate_and_persist") {
      const {
        agentId,
        imageDataUri,
        prompt,
        originalPrompt,
        category = "photorealistic",
        workspaceId = "default",
      } = body;

      if (agentId !== "agent_a" && agentId !== "agent_b") {
        return NextResponse.json(
          { error: "agentId must be either 'agent_a' or 'agent_b'." },
          { status: 400 }
        );
      }

      if (!imageDataUri || typeof imageDataUri !== "string") {
        return NextResponse.json(
          { error: "imageDataUri is required for image validation." },
          { status: 400 }
        );
      }

      // Step A: Deep file validation with Sharp
      const validation = await validateImagePayload(imageDataUri);

      // Step B: Persist to Supabase Storage / Local Workspace Vault
      const agentName =
        agentId === "agent_a" ? "Image Agent A (Subscribed)" : "Image Agent B (Subscribed)";

      const record = await StorageService.persistImage({
        dataUriOrBuffer: validation.buffer,
        prompt: (prompt || originalPrompt || "Subscribed AI Image").trim(),
        originalPrompt: (originalPrompt || prompt || "Subscribed AI Image").trim(),
        provider: agentId === "agent_a" ? "subscribed_agent_a" : "subscribed_agent_b",
        model: agentName,
        parameters: {
          width: validation.width,
          height: validation.height,
          aspectRatio: validation.aspectRatio,
          quality: "subscribed_high",
          style: category,
        },
        operation: "subscribed_agent_generation",
        userId: session.userId,
        workspaceId,
      });

      return NextResponse.json({
        success: true,
        action: "validate_and_persist",
        agentId,
        validation: {
          format: validation.format,
          width: validation.width,
          height: validation.height,
          fileSizeBytes: validation.fileSizeBytes,
          aspectRatio: validation.aspectRatio,
        },
        record,
      });
    }

    // ACTION 3: Update Agent Connection Configuration (Zero API Keys)
    if (body.action === "update_config") {
      const { agentId, connectionMode, mcpServerName, webhookUrl } = body;
      if (agentId !== "agent_a" && agentId !== "agent_b") {
        return NextResponse.json(
          { error: "agentId must be either 'agent_a' or 'agent_b'." },
          { status: 400 }
        );
      }

      const targetId = agentId as "agent_a" | "agent_b";
      const validModes = ["user_assisted", "mcp", "webhook", "oauth"];
      if (connectionMode && !validModes.includes(connectionMode)) {
        return NextResponse.json({ error: "Invalid connection mode." }, { status: 400 });
      }

      runtimeAgentConfig[targetId] = {
        ...runtimeAgentConfig[targetId],
        connectionMode: connectionMode || runtimeAgentConfig[targetId].connectionMode,
        mcpServerName: mcpServerName || runtimeAgentConfig[targetId].mcpServerName,
        webhookUrl: webhookUrl || runtimeAgentConfig[targetId].webhookUrl,
        isConnected: true,
      };

      return NextResponse.json({
        success: true,
        action: "update_config",
        agent: runtimeAgentConfig[targetId],
      });
    }

    return NextResponse.json({ error: `Unknown action '${body.action}'` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
