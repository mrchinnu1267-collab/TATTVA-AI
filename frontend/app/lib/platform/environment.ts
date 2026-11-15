/**
 * TATTVA AI - Environment Configuration & Isolation Manager (Phase 23)
 * Distinguishes Staging, Production, and Development environments with zero leakage
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export type EnvironmentTier = "development" | "staging" | "production" | "test";

export interface EnvironmentConfig {
  tier: EnvironmentTier;
  appUrl: string;
  isProduction: boolean;
  isStaging: boolean;
  enableDebugLogs: boolean;
  enforceBetaGate: boolean;
  databaseUrlConfigured: boolean;
  corsAllowedOrigins: string[];
}

export class EnvironmentManager {
  private static instance: EnvironmentManager;

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  public detectEnvironment(): EnvironmentTier {
    const env = process.env.NODE_ENV || "development";
    const vercelEnv = process.env.VERCEL_ENV; // "production" | "preview" | "development"

    if (env === "test") return "test";
    if (vercelEnv === "production") return "production";
    if (vercelEnv === "preview" || process.env.IS_STAGING === "true") return "staging";
    if (env === "production") return "production";
    return "development";
  }

  public getConfig(): EnvironmentConfig {
    const tier = this.detectEnvironment();
    const isProduction = tier === "production";
    const isStaging = tier === "staging";

    let appUrl = "http://localhost:3000";
    if (isProduction) {
      appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tattva-ai-phi.vercel.app";
    } else if (isStaging) {
      appUrl = process.env.STAGING_APP_URL || "https://staging.tattva.ai";
    }

    return {
      tier,
      appUrl,
      isProduction,
      isStaging,
      enableDebugLogs: !isProduction,
      enforceBetaGate: isStaging || process.env.ENFORCE_BETA_ACCESS === "true",
      databaseUrlConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      corsAllowedOrigins: isProduction
        ? [appUrl, "https://tattva-ai-phi.vercel.app"]
        : [appUrl, "http://localhost:3000", "http://localhost:3001"],
    };
  }
}

export const environmentManager = EnvironmentManager.getInstance();
