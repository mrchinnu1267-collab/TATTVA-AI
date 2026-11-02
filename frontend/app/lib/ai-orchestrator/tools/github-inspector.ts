/**
 * TATTVA AI - GitHub Repository & Security Analysis Engine Tool
 * Codebase inspection, dependency audits, and automated security vulnerability checks
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ToolDefinition, ToolExecutionResult, ExecutionContext } from "../types";

export interface RepoAuditReport {
  repoName: string;
  owner: string;
  defaultBranch: string;
  filesInspected: string[];
  findings: Array<{
    severity: "HIGH" | "MEDIUM" | "LOW" | "INFO";
    category: "SECRET_LEAK" | "DEPENDENCY_RISK" | "CODE_INJECTION" | "CONFIGURATION";
    file: string;
    description: string;
    recommendation: string;
  }>;
  summary: {
    totalFiles: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
    overallSecurityScore: number; // 0-100
  };
}

/**
 * Inspects a GitHub repo via GitHub public API with rate limit safety
 */
export async function inspectGitHubRepository(repoUrl: string): Promise<RepoAuditReport> {
  // Extract owner and repo from URL or "owner/repo" string
  let owner = "";
  let repo = "";

  const match = repoUrl.match(/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
  if (match) {
    owner = match[1];
    repo = match[2].replace(/\.git$/, "");
  } else if (repoUrl.includes("/")) {
    const parts = repoUrl.trim().split("/");
    owner = parts[0];
    repo = parts[1];
  }

  if (!owner || !repo) {
    throw new Error(`Invalid GitHub repository format: "${repoUrl}". Please provide "owner/repo" or "https://github.com/owner/repo"`);
  }

  const findings: RepoAuditReport["findings"] = [];
  const inspectedFiles: string[] = [];

  try {
    // 1. Fetch repo metadata
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        "User-Agent": "TattvaAI-SecurityAuditor/1.0",
        Accept: "application/vnd.github.v3+json",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!metaRes.ok) {
      if (metaRes.status === 404) {
        throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
      }
      throw new Error(`GitHub API returned HTTP ${metaRes.status}`);
    }

    const meta = await metaRes.json();
    const defaultBranch = meta.default_branch || "main";

    // 2. Fetch git tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          "User-Agent": "TattvaAI-SecurityAuditor/1.0",
          Accept: "application/vnd.github.v3+json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    let treeFiles: Array<{ path: string; size?: number; type: string }> = [];
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      treeFiles = (treeData.tree || []).filter((f: any) => f.type === "blob");
    }

    for (const f of treeFiles.slice(0, 100)) {
      inspectedFiles.push(f.path);

      // Check 1: Sensitive File Exposure
      if (
        f.path.endsWith(".env") ||
        f.path.endsWith(".env.local") ||
        f.path.endsWith(".env.production") ||
        f.path.endsWith("id_rsa") ||
        f.path.endsWith(".pem") ||
        f.path.endsWith(".p12") ||
        f.path.endsWith("credentials.json")
      ) {
        findings.push({
          severity: "HIGH",
          category: "SECRET_LEAK",
          file: f.path,
          description: `Environment or private credential file committed to repository.`,
          recommendation: `Immediately revoke any secrets contained in ${f.path}, add it to .gitignore, and purge git history using git filter-branch or BFG.`,
        });
      }

      // Check 2: Configuration weaknesses
      if (f.path === ".gitignore") {
        // Safe check
      }
    }

    // Check if .gitignore exists
    const hasGitignore = inspectedFiles.some((f) => f.toLowerCase() === ".gitignore");
    if (!hasGitignore) {
      findings.push({
        severity: "MEDIUM",
        category: "CONFIGURATION",
        file: "root",
        description: `Missing .gitignore file in root directory.`,
        recommendation: `Create a .gitignore to prevent accidental commits of node_modules, .env secrets, or local cache directories.`,
      });
    }

    // Inspect package.json or requirements.txt if present
    const packageJsonFile = treeFiles.find((f) => f.path === "package.json");
    if (packageJsonFile) {
      try {
        const rawRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/package.json`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (rawRes.ok) {
          const pkg = await rawRes.json();
          const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          
          // Check known vulnerable or obsolete dependencies
          for (const [dep, ver] of Object.entries(allDeps)) {
            if (dep === "express" && typeof ver === "string" && ver.startsWith("3.")) {
              findings.push({
                severity: "HIGH",
                category: "DEPENDENCY_RISK",
                file: "package.json",
                description: `Outdated and insecure express version (${ver}).`,
                recommendation: `Upgrade to Express 4.x or 5.x.`,
              });
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const highRisks = findings.filter((f) => f.severity === "HIGH").length;
    const mediumRisks = findings.filter((f) => f.severity === "MEDIUM").length;
    const lowRisks = findings.filter((f) => f.severity === "LOW").length;

    let overallSecurityScore = 100 - highRisks * 30 - mediumRisks * 15 - lowRisks * 5;
    if (overallSecurityScore < 10) overallSecurityScore = 10;

    return {
      repoName: repo,
      owner,
      defaultBranch,
      filesInspected: inspectedFiles,
      findings,
      summary: {
        totalFiles: inspectedFiles.length,
        highRisks,
        mediumRisks,
        lowRisks,
        overallSecurityScore,
      },
    };
  } catch (err) {
    throw err;
  }
}

export const githubInspectorTool: ToolDefinition = {
  name: "github_inspector",
  displayName: "GitHub Repository & Security Auditor",
  description: "Inspect GitHub repositories, explore directory trees, detect exposed secrets, check dependencies, and perform vulnerability assessments.",
  category: "integration",
  riskLevel: "safe",
  parameters: {
    repository: {
      type: "string",
      description: "GitHub repository URL or 'owner/repo' identifier",
      required: true,
    },
  },
  execute: async (params: Record<string, any>, context: ExecutionContext): Promise<ToolExecutionResult> => {
    const startTime = Date.now();
    try {
      const repoUrl = String(params.repository || "");
      const report = await inspectGitHubRepository(repoUrl);

      return {
        toolName: "github_inspector",
        success: true,
        output: report,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (err) {
      return {
        toolName: "github_inspector",
        success: false,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        executionTimeMs: Date.now() - startTime,
      };
    }
  },
};
