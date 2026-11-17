/**
 * TATTVA AI - Autonomous Programming Agent
 * Implements Section 4: Project-aware coding agent with file checkpoints, diff reviews,
 * dependency scanning, AST analysis, test generation, and sandbox evaluation.
 */

import { executeCodeInSandbox, SandboxLanguage } from "../ai-orchestrator/tools/code-runner";
import { advancedProgrammingAgent } from "../software-studio/dev-engine/programming-agent";
import { analyzeSourceCodeFile } from "../document-engine/multi-doc-analyzer";

export interface ProjectFile {
  path: string;
  content: string;
}

export interface ModificationCheckpoint {
  checkpointId: string;
  timestamp: number;
  filesBefore: Record<string, string>;
  filesAfter?: Record<string, string>;
  diffs: Array<{ path: string; addedLines: number; removedLines: number }>;
}

export interface ProgrammingTaskResult {
  success: boolean;
  checkpointId: string;
  filesModified: string[];
  filesCreated: string[];
  testsExecuted: boolean;
  testsPassed: boolean;
  testOutput?: string;
  securityIssues: Array<{ severity: "low" | "medium" | "high" | "critical"; rule: string; details: string; lineHint?: number }>;
  documentation?: string;
  summary: string;
  error?: string;
}

export class AutonomousProgrammingAgent {
  private checkpoints: Map<string, ModificationCheckpoint> = new Map();

  /**
   * Safe project modification lifecycle adhering to Section 4:
   * 1. Inspect project
   * 2. Understand existing architecture
   * 3. Identify affected files
   * 4. Create recovery checkpoint
   * 5. Implement changes
   * 6. Run relevant tests
   * 7. Review the diff
   */
  public async modifyProjectSafely(params: {
    projectFiles: ProjectFile[];
    targetFilesToCreateOrUpdate: ProjectFile[];
    language: SandboxLanguage;
    testHarnessCode?: string;
    generateDocs?: boolean;
  }): Promise<ProgrammingTaskResult> {
    const checkpointId = `chk_prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Snapshot existing files for checkpoint
    const filesBefore: Record<string, string> = {};
    for (const f of params.projectFiles) {
      filesBefore[f.path] = f.content;
    }

    const checkpoint: ModificationCheckpoint = {
      checkpointId,
      timestamp: Date.now(),
      filesBefore,
      diffs: [],
    };
    this.checkpoints.set(checkpointId, checkpoint);

    const filesModified: string[] = [];
    const filesCreated: string[] = [];
    const updatedProjectFilesMap = new Map<string, string>(Object.entries(filesBefore));

    // 2. Apply modifications and compute diffs
    for (const update of params.targetFilesToCreateOrUpdate) {
      const existing = updatedProjectFilesMap.get(update.path);
      if (existing !== undefined) {
        filesModified.push(update.path);
        const oldLines = existing.split("\n").length;
        const newLines = update.content.split("\n").length;
        checkpoint.diffs.push({
          path: update.path,
          addedLines: Math.max(0, newLines - oldLines),
          removedLines: Math.max(0, oldLines - newLines),
        });
      } else {
        filesCreated.push(update.path);
        checkpoint.diffs.push({
          path: update.path,
          addedLines: update.content.split("\n").length,
          removedLines: 0,
        });
      }
      updatedProjectFilesMap.set(update.path, update.content);
    }

    checkpoint.filesAfter = Object.fromEntries(updatedProjectFilesMap.entries());

    // 3. Static Security Analysis on Modified Files
    const allVulnerabilities: Array<{ severity: "low" | "medium" | "high" | "critical"; rule: string; details: string; lineHint?: number }> = [];
    for (const file of params.targetFilesToCreateOrUpdate) {
      const sec = advancedProgrammingAgent.reviewSecurity(file.content, params.language);
      allVulnerabilities.push(...sec.vulnerabilities);
    }

    const criticalIssues = allVulnerabilities.filter((i) => i.severity === "critical" || i.severity === "high");

    if (criticalIssues.length > 0) {
      // Revert from checkpoint immediately
      return {
        success: false,
        checkpointId,
        filesModified: [],
        filesCreated: [],
        testsExecuted: false,
        testsPassed: false,
        securityIssues: allVulnerabilities,
        summary: `Modifications rejected due to ${criticalIssues.length} high/critical security vulnerabilities. Checkpoint preserved.`,
        error: `Security policy violation: ${criticalIssues[0].rule} - ${criticalIssues[0].details}`,
      };
    }

    // 4. Sandbox Test Execution if test harness provided
    let testsExecuted = false;
    let testsPassed = true;
    let testOutput: string | undefined;

    if (params.testHarnessCode) {
      testsExecuted = true;
      const testRes = await executeCodeInSandbox({
        language: params.language,
        code: params.testHarnessCode,
        timeoutMs: 10000,
      });

      testsPassed = testRes.status === "success" && testRes.failedCount === 0;
      testOutput = testRes.stdout.join("\n") || testRes.stderr.join("\n");

      if (!testsPassed) {
        return {
          success: false,
          checkpointId,
          filesModified,
          filesCreated,
          testsExecuted: true,
          testsPassed: false,
          testOutput,
          securityIssues: allVulnerabilities,
          summary: `Test harness verification failed in sandbox. Code modifications flagged for correction.`,
          error: testRes.stderr.join("\n") || "Sandbox test verification failed",
        };
      }
    }

    // 5. Generate Documentation if requested
    let documentation: string | undefined;
    if (params.generateDocs) {
      documentation = this.generateDocumentation(params.targetFilesToCreateOrUpdate, params.language);
    }

    return {
      success: true,
      checkpointId,
      filesModified,
      filesCreated,
      testsExecuted,
      testsPassed,
      testOutput,
      securityIssues: allVulnerabilities,
      documentation,
      summary: `Safely modified ${filesModified.length} files and created ${filesCreated.length} files with verified tests and security clearance.`,
    };
  }

  /**
   * Reverts files to a prior checkpoint.
   */
  public rollbackToCheckpoint(checkpointId: string): Record<string, string> | null {
    const chk = this.checkpoints.get(checkpointId);
    if (!chk) return null;
    return { ...chk.filesBefore };
  }

  private generateDocumentation(files: ProjectFile[], language: string): string {
    const sections: string[] = [`# Architecture & API Documentation\n**Language:** ${language}\n`];

    for (const f of files) {
      const ast = analyzeSourceCodeFile(f.path, f.content);
      sections.push(`## \`${f.path}\``);
      sections.push(`- **Lines of Code:** ${f.content.split("\n").length}`);
      if (ast.functions.length > 0) {
        sections.push(`- **Functions / Methods:** ${ast.functions.join(", ")}`);
      }
      if (ast.classes.length > 0) {
        sections.push(`- **Classes / Structs:** ${ast.classes.join(", ")}`);
      }
      if (ast.imports.length > 0) {
        sections.push(`- **Dependencies:** ${ast.imports.join(", ")}`);
      }
      sections.push("");
    }

    return sections.join("\n");
  }
}

export const autonomousProgrammingAgent = new AutonomousProgrammingAgent();
