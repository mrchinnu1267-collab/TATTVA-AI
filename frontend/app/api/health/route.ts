import { NextResponse } from "next/server";
import { environmentManager } from "@/app/lib/platform/environment";
import { versionManager } from "@/app/lib/platform/version-manager";
import { circuitBreaker } from "@/app/lib/platform/circuit-breaker";

export const runtime = "nodejs";

export async function GET() {
  const startTime = Date.now();
  const envConfig = environmentManager.getConfig();
  const manifest = versionManager.getManifest();
  const mem = process.memoryUsage();

  const services = {
    database: envConfig.databaseUrlConfigured ? "configured" : "offline_vault_fallback",
    geminiCircuit: circuitBreaker.getStatus("gemini").state,
  };

  const isHealthy = services.geminiCircuit !== "OPEN";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      environment: envConfig.tier,
      version: manifest.version,
      releaseChannel: manifest.releaseChannel,
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
        rssMb: Math.round(mem.rss / (1024 * 1024)),
      },
      services,
      responseTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 503 }
  );
}
