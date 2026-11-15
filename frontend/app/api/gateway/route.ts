/**
 * TATTVA AI - AI Gateway API Endpoint (Phase 59)
 * Route: /api/gateway
 */

import { NextRequest, NextResponse } from "next/server";
import { aiGateway } from "@/app/lib/ai-gateway/ai-gateway";
import { GatewayRequest } from "@/app/lib/ai-gateway/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const health = await aiGateway.healthCheck();
    return NextResponse.json(
      {
        status: health.healthy ? "HEALTHY" : "DEGRADED",
        providers: health.providers,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "ERROR",
        error: error.message || "Failed to retrieve gateway status",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: GatewayRequest = await req.json();

    if (!body || !body.prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required 'prompt' parameter in request body",
        },
        { status: 400 }
      );
    }

    const result = await aiGateway.executeTask(body);

    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Unexpected internal server error in AI Gateway",
      },
      { status: 500 }
    );
  }
}
