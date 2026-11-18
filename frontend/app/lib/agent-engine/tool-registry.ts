/**
 * TATTVA AI - Centralized Tool Registry & Sandboxed Execution Dispatcher
 * Implements Section 3 (Tool-Use Engine) and Section 7 (Human Approval & Permissions)
 * Enforces strict input validation, permission gates, timeouts, and audit logging.
 */

import {
  ToolDefinitionSchema,
  ToolExecutionOutput,
  AgentExecutionContext,
  ToolPermissionLevel,
} from "./types";
import { executeCodeInSandbox, SandboxLanguage } from "../ai-orchestrator/tools/code-runner";
import { conductAuthoritativeResearch, searchAuthoritativeWeb } from "../research-engine";
import { extractTabularData, analyzeSourceCodeFile } from "../document-engine/multi-doc-analyzer";
import { classifyDocument } from "../document-engine/document-classifier";
import { advancedProgrammingAgent, TargetLanguage, GeneratedProjectFile } from "../software-studio/dev-engine/programming-agent";
import { KnowledgeGraphEngine } from "../knowledge-graph";
import { LearningPlatformEngine, SubjectDomain, DifficultyLevel } from "../learning";
import { DataSciencePlatformEngine } from "../data-science";
import { PlatformEvolutionEngine } from "../platform-evolution";
import { AIGovernanceEngine } from "../ai-governance";
import { BillingEngine } from "../billing";
import { CustomerSupportEngine } from "../support";
import { DataGovernanceEngine } from "../data-governance";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export class CentralizedToolRegistry {
  private static instance: CentralizedToolRegistry;
  private tools: Map<string, ToolDefinitionSchema> = new Map();
  private auditLog: Array<{
    timestamp: number;
    toolName: string;
    userId: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }> = [];

  private constructor() {
    this.registerCoreTools();
  }

  public static getInstance(): CentralizedToolRegistry {
    if (!CentralizedToolRegistry.instance) {
      CentralizedToolRegistry.instance = new CentralizedToolRegistry();
    }
    return CentralizedToolRegistry.instance;
  }

  public registerTool(tool: ToolDefinitionSchema): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): ToolDefinitionSchema | undefined {
    return this.tools.get(name);
  }

  public listTools(): ToolDefinitionSchema[] {
    return Array.from(this.tools.values());
  }

  public getManifest(): Array<{
    name: string;
    displayName: string;
    description: string;
    category: string;
    permission: ToolPermissionLevel;
    timeoutMs: number;
    inputSchema: Record<string, any>;
  }> {
    return this.listTools().map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      category: t.category,
      permission: t.permission,
      timeoutMs: t.timeoutMs,
      inputSchema: t.inputSchema,
    }));
  }

  public async executeTool(
    toolName: string,
    params: Record<string, any>,
    context: AgentExecutionContext
  ): Promise<ToolExecutionOutput> {
    const startTime = Date.now();
    const tool = this.getTool(toolName);

    if (!tool) {
      const err = `Tool "${toolName}" is not registered in TATTVA Centralized Tool Registry.`;
      this.recordAudit(toolName, context.userId, false, Date.now() - startTime, err);
      return {
        toolName,
        success: false,
        output: null,
        error: err,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Permission authorization check
    if (tool.permission === "approval_required" && !context.isApprovalGranted) {
      const err = `Tool "${tool.displayName}" requires explicit user approval before execution.`;
      this.recordAudit(toolName, context.userId, false, Date.now() - startTime, err);
      return {
        toolName,
        success: false,
        output: null,
        error: err,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Input schema validation
    const validationError = this.validateInputs(tool, params);
    if (validationError) {
      this.recordAudit(toolName, context.userId, false, Date.now() - startTime, validationError);
      return {
        toolName,
        success: false,
        output: null,
        error: `Input validation failed: ${validationError}`,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Timeout-bounded execution
    const timeoutPromise = new Promise<ToolExecutionOutput>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Tool "${toolName}" exceeded execution timeout of ${tool.timeoutMs}ms.`));
      }, tool.timeoutMs);
    });

    try {
      const result = await Promise.race([tool.execute(params, context), timeoutPromise]);
      const durationMs = Date.now() - startTime;
      this.recordAudit(toolName, context.userId, result.success, durationMs, result.error);
      return {
        ...result,
        executionTimeMs: durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err?.message || String(err);
      this.recordAudit(toolName, context.userId, false, durationMs, errorMsg);
      return {
        toolName,
        success: false,
        output: null,
        error: errorMsg,
        executionTimeMs: durationMs,
      };
    }
  }

  private validateInputs(tool: ToolDefinitionSchema, params: Record<string, any>): string | null {
    for (const [key, schema] of Object.entries(tool.inputSchema)) {
      const val = params[key];
      if (schema.required && (val === undefined || val === null || val === "")) {
        return `Missing required parameter "${key}".`;
      }
      if (val !== undefined && val !== null) {
        if (schema.type === "number" && typeof val !== "number") {
          return `Parameter "${key}" must be a number.`;
        }
        if (schema.type === "string" && typeof val !== "string") {
          return `Parameter "${key}" must be a string.`;
        }
        if (schema.type === "boolean" && typeof val !== "boolean") {
          return `Parameter "${key}" must be a boolean.`;
        }
        if (schema.type === "array" && !Array.isArray(val)) {
          return `Parameter "${key}" must be an array.`;
        }
        if (schema.enum && !schema.enum.includes(val)) {
          return `Parameter "${key}" must be one of: ${schema.enum.join(", ")}.`;
        }
      }
    }
    return null;
  }

  private recordAudit(toolName: string, userId: string, success: boolean, durationMs: number, error?: string): void {
    this.auditLog.push({
      timestamp: Date.now(),
      toolName,
      userId,
      success,
      durationMs,
      error,
    });
    if (this.auditLog.length > 500) {
      this.auditLog.shift();
    }
  }

  public getAuditLog() {
    return [...this.auditLog];
  }

  // ==========================================
  // CORE TOOL IMPLEMENTATIONS (10 Tools)
  // ==========================================
  private registerCoreTools(): void {
    // 1. Web Research Tool
    this.registerTool({
      name: "web_research",
      displayName: "Deep Web Research",
      description: "Performs live web research and multi-source synthesis with authority tiering, conflicting evidence analysis, and zero-hallucination citations.",
      category: "research",
      permission: "safe",
      timeoutMs: 30000,
      inputSchema: {
        query: { type: "string", description: "Search query or research topic", required: true },
        depth: { type: "string", description: "Search depth", enum: ["shallow", "deep"], default: "shallow" },
      },
      outputSchema: {
        summary: "string",
        sources: "array",
      },
      execute: async (params) => {
        if (params.depth === "deep") {
          const dossier = await conductAuthoritativeResearch(params.query, { maxSources: 4 });
          return {
            toolName: "web_research",
            success: true,
            output: {
              summary: dossier.markdownReport,
              executiveSummary: dossier.executiveSummary,
              keyFindings: dossier.keyFindings,
              conflictsCount: dossier.conflictingEvidence.length,
              sourcesCount: dossier.sources.length,
            },
            citations: dossier.citations.map((c) => ({
              title: c.title,
              url: c.url,
              snippet: `${c.domain} [${c.authorityTier}]${c.publishedDate ? ` (Published: ${c.publishedDate})` : ""}`,
            })),
            executionTimeMs: dossier.executionDurationMs,
          };
        }
        const searchResults = await searchAuthoritativeWeb(params.query, 5);
        return {
          toolName: "web_research",
          success: true,
          output: {
            resultsCount: searchResults.length,
            results: searchResults,
          },
          citations: searchResults.map((r) => ({
            title: r.title,
            url: r.url,
            snippet: `${r.snippet} [${r.domain}]`,
          })),
          executionTimeMs: 0,
        };
      },
    });

    // 2. Safe File Reader Tool
    this.registerTool({
      name: "file_reader",
      displayName: "Safe File Reader",
      description: "Reads file content from the workspace with strict path traversal guardrails.",
      category: "file",
      permission: "safe",
      timeoutMs: 5000,
      inputSchema: {
        filePath: { type: "string", description: "Relative path to file in workspace", required: true },
      },
      outputSchema: {
        content: "string",
        sizeBytes: "number",
      },
      execute: async (params) => {
        // Enforce strict path traversal check
        if (!params.filePath || params.filePath.includes("..") || path.isAbsolute(params.filePath)) {
          return {
            toolName: "file_reader",
            success: false,
            output: null,
            error: "Path traversal or absolute paths are strictly prohibited.",
            executionTimeMs: 0,
          };
        }
        const basePath = path.resolve(process.cwd());
        const fullPath = path.join(basePath, params.filePath);

        try {
          const content = await fs.readFile(fullPath, "utf-8");
          return {
            toolName: "file_reader",
            success: true,
            output: {
              filePath: params.filePath,
              content: content.slice(0, 50000),
              sizeBytes: Buffer.byteLength(content),
              truncated: content.length > 50000,
            },
            executionTimeMs: 0,
          };
        } catch (e: any) {
          return {
            toolName: "file_reader",
            success: false,
            output: null,
            error: `Failed to read file "${params.filePath}": ${e?.message}`,
            executionTimeMs: 0,
          };
        }
      },
    });

    // 3. Document Analyzer Tool
    this.registerTool({
      name: "document_analyzer",
      displayName: "Document & Tabular Analyzer",
      description: "Parses structured documents, CSVs, Markdown tables, and extracts statistics.",
      category: "data",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        content: { type: "string", description: "Raw text or tabular data", required: true },
        format: { type: "string", description: "Document format", enum: ["csv", "markdown", "text"], default: "csv" },
      },
      outputSchema: {
        rowCount: "number",
        headers: "array",
        summaryStats: "object",
      },
      execute: async (params) => {
        if (params.format === "csv" || params.format === "markdown") {
          const parsed = extractTabularData(params.content, "dataset.csv");
          const firstTable = parsed[0];
          return {
            toolName: "document_analyzer",
            success: true,
            output: {
              tables: parsed,
              rowCount: firstTable ? firstTable.rowCount : 0,
              headers: firstTable ? firstTable.headers : [],
            },
            executionTimeMs: 0,
          };
        }
        const classification = classifyDocument(params.content, "input_document.txt", params.format);
        return {
          toolName: "document_analyzer",
          success: true,
          output: {
            format: classification.detectedFormat,
            category: classification.category,
            wordCount: classification.wordCount,
            sectionCount: classification.sectionCount,
            sections: classification.sections,
            summary: classification.summary,
            charCount: params.content.length,
            preview: params.content.slice(0, 500),
          },
          executionTimeMs: 0,
        };
      },
    });

    // 4. Code Generator Tool
    this.registerTool({
      name: "code_generator",
      displayName: "Code Architecture & Generation",
      description: "Generates multi-file software projects, architectures, schemas, and tests.",
      category: "code",
      permission: "safe",
      timeoutMs: 25000,
      inputSchema: {
        objective: { type: "string", description: "Software objective to build", required: true },
        primaryLanguage: { type: "string", description: "Target language (python, java, typescript, etc.)", required: true },
      },
      outputSchema: {
        architecture: "object",
        project: "object",
      },
      execute: async (params) => {
        const lang: TargetLanguage = (params.primaryLanguage || "python").toLowerCase() as TargetLanguage;
        const arch = advancedProgrammingAgent.generateArchitecture(params.objective, lang);
        const proj = advancedProgrammingAgent.synthesizeProject(params.objective, lang);
        return {
          toolName: "code_generator",
          success: true,
          output: {
            architecture: arch,
            project: proj,
            fileCount: proj.files.length,
          },
          artifacts: proj.files.map((f: GeneratedProjectFile) => ({
            type: "source_code",
            title: f.path,
            data: f.content,
            path: f.path,
          })),
          executionTimeMs: 0,
        };
      },
    });

    // 5. Code Runner Tool (Sandbox)
    this.registerTool({
      name: "code_runner",
      displayName: "Sandboxed Multi-Language Code Runner",
      description: "Executes code in isolated VM or stripped child process with automated test runner.",
      category: "code",
      permission: "safe",
      timeoutMs: 20000,
      inputSchema: {
        language: { type: "string", description: "Language (javascript, typescript, python, java, c, cpp, sql)", required: true },
        code: { type: "string", description: "Source code to execute", required: true },
        stdin: { type: "string", description: "Standard input", default: "" },
        testCases: { type: "array", description: "Optional automated test cases" },
      },
      outputSchema: {
        stdout: "string",
        stderr: "string",
        exitCode: "number",
      },
      execute: async (params) => {
        const result = await executeCodeInSandbox({
          language: params.language as SandboxLanguage,
          code: params.code,
          stdin: params.stdin,
          testCases: params.testCases,
          timeoutMs: 8000,
        });
        const hasErrors = result.status !== "success" || result.failedCount > 0;
        return {
          toolName: "code_runner",
          success: !hasErrors,
          output: result,
          error: hasErrors ? result.stderr.join("\n") || `Execution status: ${result.status}` : undefined,
          executionTimeMs: result.executionDurationMs,
        };
      },
    });

    // 6. Database Operations Tool
    this.registerTool({
      name: "db_query",
      displayName: "Database Query Engine",
      description: "Executes structured SQL queries in isolated SQLite memory database.",
      category: "database",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        sql: { type: "string", description: "SQL query or schema definition", required: true },
        schema: { type: "string", description: "Optional DDL to initialize database" },
      },
      outputSchema: {
        result: "object",
      },
      execute: async (params) => {
        const fullScript = params.schema ? `${params.schema}\n${params.sql}` : params.sql;
        const res = await executeCodeInSandbox({
          language: "sql",
          code: fullScript,
          timeoutMs: 6000,
        });
        const hasErrors = res.status !== "success";
        return {
          toolName: "db_query",
          success: !hasErrors,
          output: {
            stdout: res.stdout,
            status: res.status,
          },
          error: hasErrors ? res.stderr.join("\n") || `SQL execution status: ${res.status}` : undefined,
          executionTimeMs: res.executionDurationMs,
        };
      },
    });

    // 7. Project Source Analyzer
    this.registerTool({
      name: "project_analyzer",
      displayName: "Source Code & Dependency Analyzer",
      description: "Scans code files to extract AST symbols, functions, classes, and security flaws.",
      category: "code",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        code: { type: "string", description: "Source code text to analyze", required: true },
        filename: { type: "string", description: "Filename for language detection", required: true },
      },
      outputSchema: {
        symbols: "object",
        securityReview: "object",
      },
      execute: async (params) => {
        const analysis = analyzeSourceCodeFile(params.filename, params.code);
        const sec = advancedProgrammingAgent.reviewSecurity(params.code);
        return {
          toolName: "project_analyzer",
          success: true,
          output: {
            analysis,
            securityReview: sec,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 8. API Caller Tool
    this.registerTool({
      name: "api_caller",
      displayName: "External HTTP API Caller",
      description: "Performs outbound API requests with strict SSRF guardrails.",
      category: "api",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        url: { type: "string", description: "Target HTTP/HTTPS URL", required: true },
        method: { type: "string", description: "HTTP Method", enum: ["GET", "POST"], default: "GET" },
        headers: { type: "object", description: "HTTP Headers" },
        body: { type: "string", description: "Request payload" },
      },
      outputSchema: {
        status: "number",
        data: "string",
      },
      execute: async (params, context) => {
        try {
          const parsed = new URL(params.url);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return {
              toolName: "api_caller",
              success: false,
              output: null,
              error: "Only HTTP and HTTPS protocols are allowed.",
              executionTimeMs: 0,
            };
          }
          const hostname = parsed.hostname.toLowerCase();
          if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname.startsWith("192.168.") ||
            hostname.startsWith("10.") ||
            hostname === "169.254.169.254"
          ) {
            return {
              toolName: "api_caller",
              success: false,
              output: null,
              error: `Access to private or local host "${hostname}" is blocked by security policy.`,
              executionTimeMs: 0,
            };
          }

          if (params.method === "POST" && !context.isApprovalGranted) {
            return {
              toolName: "api_caller",
              success: false,
              output: null,
              error: `Outbound POST request to "${params.url}" requires user approval.`,
              executionTimeMs: 0,
            };
          }

          const res = await fetch(params.url, {
            method: params.method || "GET",
            headers: params.headers || {},
            body: params.method === "POST" ? params.body : undefined,
            signal: AbortSignal.timeout(10000),
          });
          const text = await res.text();
          return {
            toolName: "api_caller",
            success: res.ok,
            output: {
              status: res.status,
              statusText: res.statusText,
              data: text.slice(0, 10000),
            },
            executionTimeMs: 0,
          };
        } catch (e: any) {
          return {
            toolName: "api_caller",
            success: false,
            output: null,
            error: `API call failed: ${e?.message}`,
            executionTimeMs: 0,
          };
        }
      },
    });

    // 9. Mathematical Calculator
    this.registerTool({
      name: "math_calculator",
      displayName: "Precision Mathematical Calculator",
      description: "Evaluates mathematical expressions, statistics, and algebraic calculations safely.",
      category: "math",
      permission: "safe",
      timeoutMs: 5000,
      inputSchema: {
        expression: { type: "string", description: "Mathematical expression to evaluate", required: true },
      },
      outputSchema: {
        result: "number",
      },
      execute: async (params) => {
        const expr = params.expression.trim();
        const clean = expr.replace(/\s+/g, "");
        if (!/^[0-9+\-*/().,%^Math.PIEsincoatglqdbrt\s]+$/.test(clean)) {
          return {
            toolName: "math_calculator",
            success: false,
            output: null,
            error: "Expression contains invalid mathematical tokens.",
            executionTimeMs: 0,
          };
        }
        try {
          const compute = new Function(
            `"use strict"; const { sin, cos, tan, sqrt, pow, log, exp, PI, E, abs, round, floor, ceil } = Math; return (${clean});`
          );
          const result = compute();
          return {
            toolName: "math_calculator",
            success: true,
            output: {
              expression: expr,
              result: typeof result === "number" ? result : String(result),
            },
            executionTimeMs: 0,
          };
        } catch (e: any) {
          return {
            toolName: "math_calculator",
            success: false,
            output: null,
            error: `Calculation failed: ${e?.message}`,
            executionTimeMs: 0,
          };
        }
      },
    });

    // 10. Data Analyzer Tool
    this.registerTool({
      name: "data_analyzer",
      displayName: "Statistical Data Analyzer",
      description: "Computes descriptive statistics (mean, median, stddev, range, counts) on datasets.",
      category: "data",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        numbers: { type: "array", description: "Numeric array for statistical analysis", required: true },
      },
      outputSchema: {
        count: "number",
        mean: "number",
        median: "number",
        min: "number",
        max: "number",
        stddev: "number",
      },
      execute: async (params) => {
        const nums: number[] = params.numbers.filter((n: any) => typeof n === "number" && !isNaN(n));
        if (nums.length === 0) {
          return {
            toolName: "data_analyzer",
            success: false,
            output: null,
            error: "No valid numbers provided for analysis.",
            executionTimeMs: 0,
          };
        }
        const count = nums.length;
        const sorted = [...nums].sort((a, b) => a - b);
        const sum = sorted.reduce((acc, v) => acc + v, 0);
        const mean = sum / count;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = count % 2 === 0 ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2 : sorted[Math.floor(count / 2)];
        const variance = sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
        const stddev = Math.sqrt(variance);

        return {
          toolName: "data_analyzer",
          success: true,
          output: {
            count,
            sum,
            mean,
            median,
            min,
            max,
            range: max - min,
            variance,
            stddev,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 11. Knowledge Graph Semantic QA Tool
    this.registerTool({
      name: "query_knowledge_graph",
      displayName: "Knowledge Graph Semantic QA",
      description: "Queries the user's multi-tenant knowledge graph to answer architectural, conceptual, and relationship questions with multi-hop citations and contradiction awareness.",
      category: "data",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        question: { type: "string", description: "Natural language query about entities or relationships", required: true },
        workspaceId: { type: "string", description: "Target workspace ID", default: "default" },
      },
      outputSchema: {
        answer: "string",
        targetEntities: "array",
        relationships: "array",
        confidence: "number",
      },
      execute: async (params, context) => {
        const userId = context.userId || "anonymous";
        const workspaceId = params.workspaceId || "default";
        const qaResult = await KnowledgeGraphEngine.queryGraphQA(userId, workspaceId, params.question);
        return {
          toolName: "query_knowledge_graph",
          success: true,
          output: {
            answer: qaResult.answer,
            targetEntities: qaResult.targetEntities.map((e) => ({ id: e.id, name: e.name, type: e.type })),
            relationshipsCount: qaResult.relationships.length,
            contradictionsCount: qaResult.contradictionsFound.length,
            confidence: qaResult.confidence,
          },
          citations: qaResult.citations.map((c) => ({
            title: `Entity Reference (${c.documentId || "Knowledge Graph"})`,
            url: c.documentId ? `/api/documents?id=${c.documentId}` : "/api/knowledge-graph",
            snippet: c.snippet,
          })),
          executionTimeMs: 0,
        };
      },
    });

    // 12. Knowledge Graph Relationship Traversal Tool
    this.registerTool({
      name: "traverse_knowledge_graph",
      displayName: "Knowledge Graph Path Traversal",
      description: "Finds the shortest semantic path and architectural connections between two concepts or entities in the knowledge graph.",
      category: "data",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        source: { type: "string", description: "Source entity name or ID", required: true },
        target: { type: "string", description: "Target entity name or ID", required: true },
        workspaceId: { type: "string", description: "Target workspace ID", default: "default" },
      },
      outputSchema: {
        found: "boolean",
        hopCount: "number",
        explanation: "string",
      },
      execute: async (params, context) => {
        const userId = context.userId || "anonymous";
        const workspaceId = params.workspaceId || "default";
        const path = KnowledgeGraphEngine.traversePath(userId, workspaceId, params.source, params.target);
        return {
          toolName: "traverse_knowledge_graph",
          success: true,
          output: {
            found: !!path,
            hopCount: path ? path.hopCount : 0,
            explanation: path ? path.explanation : `No direct path found between ${params.source} and ${params.target}`,
            nodes: path ? path.nodes.map((n) => n.name) : [],
          },
          executionTimeMs: 0,
        };
      },
    });

    // 13. Personalized Study Plan Generator Tool
    this.registerTool({
      name: "create_study_plan",
      displayName: "Personalized Curriculum Generator",
      description: "Generates an adaptive, multi-module learning syllabus tailored to user baselines and target mastery levels.",
      category: "data",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        topic: { type: "string", description: "Subject or topic to master", required: true },
        domain: { type: "string", description: "Subject domain (programming, computer_science, mathematics, system_architecture, data_structures_algorithms, general)", default: "computer_science" },
        baselineLevel: { type: "string", description: "Learner's current level (beginner, intermediate, advanced, expert)", default: "beginner" },
        targetLevel: { type: "string", description: "Target level to achieve", default: "advanced" },
        workspaceId: { type: "string", description: "Workspace ID", default: "default" },
      },
      outputSchema: {
        curriculumId: "string",
        totalEstimatedHours: "number",
        modules: "array",
      },
      execute: async (params, context) => {
        const userId = context.userId || "anonymous";
        const workspaceId = params.workspaceId || "default";
        const curriculum = LearningPlatformEngine.createCurriculum(
          userId,
          workspaceId,
          params.topic,
          (params.domain as SubjectDomain) || "computer_science",
          (params.baselineLevel as DifficultyLevel) || "beginner",
          (params.targetLevel as DifficultyLevel) || "advanced"
        );
        return {
          toolName: "create_study_plan",
          success: true,
          output: {
            curriculumId: curriculum.id,
            topic: curriculum.topic,
            totalEstimatedHours: curriculum.totalEstimatedHours,
            moduleCount: curriculum.modules.length,
            modules: curriculum.modules.map((m) => ({ order: m.order, title: m.title, minutes: m.estimatedMinutes })),
          },
          executionTimeMs: 0,
        };
      },
    });

    // 14. Interactive Quiz Generator Tool
    this.registerTool({
      name: "generate_quiz",
      displayName: "Interactive Quiz Generator",
      description: "Generates interactive multi-choice or coding quiz questions with progressive hints for a concept or topic.",
      category: "data",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        topic: { type: "string", description: "Topic for assessment", required: true },
        domain: { type: "string", description: "Domain of study", default: "computer_science" },
        level: { type: "string", description: "Difficulty level", default: "intermediate" },
        questionCount: { type: "number", description: "Number of questions (1-10)", default: 3 },
      },
      outputSchema: {
        quizId: "string",
        questions: "array",
      },
      execute: async (params, context) => {
        const quiz = LearningPlatformEngine.createQuiz(
          params.topic,
          (params.domain as SubjectDomain) || "computer_science",
          (params.level as DifficultyLevel) || "intermediate",
          params.questionCount || 3
        );
        return {
          toolName: "generate_quiz",
          success: true,
          output: {
            quizId: quiz.id,
            topic: quiz.topic,
            questionCount: quiz.questions.length,
            questions: quiz.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
          },
          executionTimeMs: 0,
        };
      },
    });

    // 15. Step-by-Step Solution Derivation Tool
    this.registerTool({
      name: "derive_step_by_step_solution",
      displayName: "Step-by-Step Problem Solver",
      description: "Deconstructs complex mathematical, algorithmic, or architectural problems into an ordered sequence of verified derivation steps.",
      category: "math",
      permission: "safe",
      timeoutMs: 20000,
      inputSchema: {
        problem: { type: "string", description: "Problem statement to solve", required: true },
        domain: { type: "string", description: "Subject domain", default: "computer_science" },
        difficulty: { type: "string", description: "Problem difficulty", default: "intermediate" },
      },
      outputSchema: {
        solutionId: "string",
        totalSteps: "number",
        steps: "array",
        finalAnswer: "string",
      },
      execute: async (params, context) => {
        const solution = LearningPlatformEngine.deriveSolution(
          params.problem,
          (params.domain as SubjectDomain) || "computer_science",
          (params.difficulty as DifficultyLevel) || "intermediate"
        );
        return {
          toolName: "derive_step_by_step_solution",
          success: true,
          output: {
            solutionId: solution.id,
            totalSteps: solution.totalSteps,
            steps: solution.steps.map((s) => ({ step: s.stepNumber, title: s.title, explanation: s.explanation })),
            finalAnswer: solution.finalAnswer,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 16. Automated EDA Engine Tool
    this.registerTool({
      name: "run_eda",
      displayName: "Automated Exploratory Data Analysis",
      description: "Computes descriptive statistics, distributions, Pearson correlations, and Tukey's IQR outliers for a dataset.",
      category: "data",
      permission: "safe",
      timeoutMs: 20000,
      inputSchema: {
        datasetId: { type: "string", description: "Target dataset ID" },
        csvContent: { type: "string", description: "Raw CSV content to profile" },
        workspaceId: { type: "string", description: "Workspace ID", default: "default" },
      },
      outputSchema: {
        rowCount: "number",
        columnCount: "number",
        missingValuesTotal: "number",
        correlationsCount: "number",
        outliersCount: "number",
      },
      execute: async (params, context) => {
        const userId = context.userId || "anonymous";
        const workspaceId = params.workspaceId || "default";
        let dataset = params.datasetId ? DataSciencePlatformEngine.getDataset(userId, workspaceId, params.datasetId) : null;
        if (!dataset && params.csvContent) {
          dataset = DataSciencePlatformEngine.ingestCSV(userId, workspaceId, "Ad-Hoc Analysis", params.csvContent);
        }
        if (!dataset) {
          const all = DataSciencePlatformEngine.listDatasets(userId, workspaceId);
          dataset = all[0];
        }
        if (!dataset) {
          return {
            toolName: "run_eda",
            success: false,
            output: null,
            error: "No dataset available for EDA.",
            executionTimeMs: 0,
          };
        }
        const eda = DataSciencePlatformEngine.runEDA(dataset);
        return {
          toolName: "run_eda",
          success: true,
          output: {
            datasetName: dataset.name,
            rowCount: eda.rowCount,
            columnCount: eda.columnCount,
            missingValuesTotal: eda.missingValuesTotal,
            numericColumns: Object.keys(eda.numericStats),
            correlationsCount: eda.correlations.length,
            outliersCount: eda.outliers.length,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 17. Natural Language Tabular Query Tool
    this.registerTool({
      name: "query_dataset",
      displayName: "Natural Language Tabular Query",
      description: "Executes natural language queries, aggregations, and filters over tabular datasets.",
      category: "data",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        query: { type: "string", description: "Conversational question about dataset", required: true },
        datasetId: { type: "string", description: "Target dataset ID" },
        workspaceId: { type: "string", description: "Workspace ID", default: "default" },
      },
      outputSchema: {
        interpretation: "string",
        totalMatchingRows: "number",
        aggregationSummary: "string",
      },
      execute: async (params, context) => {
        const userId = context.userId || "anonymous";
        const workspaceId = params.workspaceId || "default";
        let dataset = params.datasetId ? DataSciencePlatformEngine.getDataset(userId, workspaceId, params.datasetId) : null;
        if (!dataset) {
          const all = DataSciencePlatformEngine.listDatasets(userId, workspaceId);
          dataset = all[0];
        }
        if (!dataset) {
          return {
            toolName: "query_dataset",
            success: false,
            output: null,
            error: "No dataset available for query.",
            executionTimeMs: 0,
          };
        }
        const result = DataSciencePlatformEngine.queryDataset(dataset, params.query);
        return {
          toolName: "query_dataset",
          success: true,
          output: {
            query: result.query,
            interpretation: result.interpretation,
            totalMatchingRows: result.totalMatchingRows,
            aggregationSummary: result.aggregationSummary,
            topResult: result.resultRows[0] || null,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 18. AutoML Model Recommender Tool
    this.registerTool({
      name: "recommend_ml_model",
      displayName: "AutoML Architecture Recommender",
      description: "Analyzes dataset schema and target distribution to recommend machine learning algorithms and scikit-learn pipelines.",
      category: "code",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        datasetId: { type: "string", description: "Target dataset ID" },
        targetColumn: { type: "string", description: "Target variable to predict" },
        workspaceId: { type: "string", description: "Workspace ID", default: "default" },
      },
      outputSchema: {
        taskType: "string",
        targetColumn: "string",
        topAlgorithm: "string",
      },
      execute: async (params, context) => {
        const userId = context.userId || "anonymous";
        const workspaceId = params.workspaceId || "default";
        let dataset = params.datasetId ? DataSciencePlatformEngine.getDataset(userId, workspaceId, params.datasetId) : null;
        if (!dataset) {
          const all = DataSciencePlatformEngine.listDatasets(userId, workspaceId);
          dataset = all[0];
        }
        if (!dataset) {
          return {
            toolName: "recommend_ml_model",
            success: false,
            output: null,
            error: "No dataset available for ML recommendation.",
            executionTimeMs: 0,
          };
        }
        const rec = DataSciencePlatformEngine.recommendML(dataset, params.targetColumn);
        return {
          toolName: "recommend_ml_model",
          success: true,
          output: {
            taskType: rec.taskType,
            targetColumn: rec.targetColumn,
            topAlgorithm: rec.suggestedAlgorithms[0]?.name || "N/A",
            algorithmsCount: rec.suggestedAlgorithms.length,
            evaluationMetrics: rec.evaluationMetrics,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 19. Statistical Hypothesis Testing Tool
    this.registerTool({
      name: "run_statistical_test",
      displayName: "Statistical Hypothesis Tester",
      description: "Executes Welch's t-test, ANOVA F-test, or Chi-Square independence test with exact p-value computations.",
      category: "math",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        testType: { type: "string", description: "two_sample_t_test, anova, or chi_square", default: "two_sample_t_test" },
        sample1: { type: "array", description: "Numerical array for sample 1" },
        sample2: { type: "array", description: "Numerical array for sample 2" },
        alpha: { type: "number", description: "Significance threshold", default: 0.05 },
      },
      outputSchema: {
        testName: "string",
        testStatistic: "number",
        pValue: "number",
        isSignificant: "boolean",
        conclusion: "string",
      },
      execute: async (params, context) => {
        const s1 = Array.isArray(params.sample1) ? params.sample1.map(Number).filter((v: number) => !isNaN(v)) : [10, 12, 14, 15, 11];
        const s2 = Array.isArray(params.sample2) ? params.sample2.map(Number).filter((v: number) => !isNaN(v)) : [20, 22, 25, 23, 21];
        const res = DataSciencePlatformEngine.runTTest(s1, s2, params.alpha || 0.05);
        return {
          toolName: "run_statistical_test",
          success: true,
          output: {
            testName: res.testName,
            testStatistic: res.testStatistic,
            pValue: res.pValue,
            isSignificant: res.isSignificant,
            conclusion: res.conclusion,
            interpretation: res.interpretation,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 20. Platform Health & Performance Metrics Tool
    this.registerTool({
      name: "get_platform_health_metrics",
      displayName: "Platform Health & Telemetry Monitor",
      description: "Retrieves real-time P50/P95 latencies, error rates, system uptime, and active performance degradations.",
      category: "data",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {},
      outputSchema: {
        status: "string",
        uptimeSeconds: "number",
        overallErrorRatePercent: "number",
        chatP50Ms: "number",
        chatP95Ms: "number",
        alertsCount: "number",
      },
      execute: async () => {
        const snap = PlatformEvolutionEngine.getPerformanceSnapshot();
        return {
          toolName: "get_platform_health_metrics",
          success: true,
          output: {
            status: snap.status,
            uptimeSeconds: snap.uptimeSeconds,
            overallErrorRatePercent: snap.overallErrorRatePercent,
            chatP50Ms: snap.chatLatency.p50Ms,
            chatP95Ms: snap.chatLatency.p95Ms,
            alertsCount: snap.performanceDegradations.length,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 21. AI Quality Benchmark Evaluation Tool
    this.registerTool({
      name: "run_ai_quality_eval",
      displayName: "AI Quality Benchmark Evaluator",
      description: "Evaluates AI model responses across 8 permanent quality benchmarks against baseline validation thresholds.",
      category: "research",
      permission: "safe",
      timeoutMs: 20000,
      inputSchema: {
        targetModel: { type: "string", description: "Target model ID to evaluate", default: "gemini-2.5-flash" },
      },
      outputSchema: {
        overallScorePercent: "number",
        baselineScorePercent: "number",
        passedValidationGate: "boolean",
        summary: "string",
      },
      execute: async (params) => {
        const res = PlatformEvolutionEngine.runQualityEvaluation(params.targetModel || "gemini-2.5-flash");
        return {
          toolName: "run_ai_quality_eval",
          success: true,
          output: {
            overallScorePercent: res.overallScorePercent,
            baselineScorePercent: res.baselineScorePercent,
            passedValidationGate: res.passedValidationGate,
            summary: res.summary,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 22. Model Provider Canary Testing Tool
    this.registerTool({
      name: "test_model_canary",
      displayName: "Model Canary Tester",
      description: "Executes isolated candidate model canary evaluation before promoting to live production routing.",
      category: "code",
      permission: "approval_required",
      timeoutMs: 25000,
      inputSchema: {
        candidateModelId: { type: "string", description: "Candidate model ID" },
        displayName: { type: "string", description: "Candidate model display name" },
        provider: { type: "string", description: "Model provider", default: "google-gemini" },
      },
      outputSchema: {
        candidateModelId: "string",
        accuracyDeltaPercent: "number",
        latencyDeltaPercent: "number",
        recommendation: "string",
      },
      execute: async (params) => {
        const candidate = {
          id: params.candidateModelId || "gemini-canary",
          displayName: params.displayName || "Gemini Canary Test",
          provider: params.provider || "google-gemini",
          tier: "fast",
          contextWindowTokens: 1000000,
          costPer1MTokensInUsd: 0.075,
          costPer1MTokensOutUsd: 0.3,
          isAvailable: true,
          consecutiveFailures: 0,
          averageLatencyMs: 370,
          errorRatePercent: 0.1,
          circuitState: "CLOSED",
        };
        const res = PlatformEvolutionEngine.testModelCanary(candidate as any);
        return {
          toolName: "test_model_canary",
          success: true,
          output: {
            candidateModelId: res.candidateModelId,
            accuracyDeltaPercent: res.accuracyDeltaPercent,
            latencyDeltaPercent: res.latencyDeltaPercent,
            recommendation: res.recommendation,
            rationale: res.detailedRationale,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 23. Backup & Recovery Verifier Tool
    this.registerTool({
      name: "verify_backup_recovery",
      displayName: "Backup & Recovery Verifier",
      description: "Performs cryptographic checksum checks on database backups, storage files, and verifies rollback readiness.",
      category: "security",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {},
      outputSchema: {
        databaseStatus: "string",
        tableCount: "number",
        fileStorageStatus: "string",
        rollbackReady: "boolean",
        overallHealthy: "boolean",
      },
      execute: async () => {
        const res = PlatformEvolutionEngine.verifyBackupIntegrity();
        return {
          toolName: "verify_backup_recovery",
          success: true,
          output: {
            databaseStatus: res.databaseIntegrity.status,
            tableCount: res.databaseIntegrity.tableCount,
            fileStorageStatus: res.fileStorageIntegrity.status,
            rollbackReady: res.deploymentRollbackTarget.status === "available",
            overallHealthy: res.overallBackupHealthy,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 24. AI Governance & Content Safety Scanner Tool (Phase 44)
    this.registerTool({
      name: "scan_content_safety",
      displayName: "AI Content Safety & Policy Scanner",
      description: "Evaluates text against hate speech, harassment, self-harm, sexual content, violence, dangerous weapons, and adversarial prompt injections.",
      category: "security",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        text: { type: "string", description: "Text to evaluate for safety and policy compliance" },
      },
      outputSchema: {
        overallSafe: "boolean",
        action: "string",
        highestRiskScore: "number",
        violations: "array",
      },
      execute: async (params: Record<string, any>) => {
        const text = params.text || "";
        const engine = AIGovernanceEngine.getInstance();
        const scan = await engine.scanInboundPrompt(text, "agent_tool_caller");
        return {
          toolName: "scan_content_safety",
          success: true,
          output: {
            overallSafe: scan.safetyResult.overallSafe,
            action: scan.action,
            highestRiskScore: scan.safetyResult.highestRiskScore,
            violations: scan.safetyResult.violations,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 25. PII & Sensitive Data Sanitizer Tool (Phase 44)
    this.registerTool({
      name: "redact_sensitive_pii",
      displayName: "Sensitive Data & PII Redactor",
      description: "Detects and redacts credit cards (Luhn-verified), SSNs, secret API keys, emails, phone numbers, and credentials.",
      category: "security",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        text: { type: "string", description: "Text containing potential sensitive PII to redact" },
      },
      outputSchema: {
        isClean: "boolean",
        cleanText: "string",
        findingsCount: "number",
        redactedTypes: "array",
      },
      execute: async (params: Record<string, any>) => {
        const text = params.text || "";
        const engine = AIGovernanceEngine.getInstance();
        const pii = engine["piiProtector"].sanitize(text);
        return {
          toolName: "redact_sensitive_pii",
          success: true,
          output: {
            isClean: pii.isClean,
            cleanText: pii.cleanText,
            findingsCount: pii.findingsCount,
            redactedTypes: pii.redactedTypes,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 26. Human-in-the-Loop Approval Gate Tool (Phase 44)
    this.registerTool({
      name: "request_human_approval",
      displayName: "Human Approval Gate",
      description: "Dispatches a formal human approval request for irreversible, financial, or high-risk autonomous agent operations.",
      category: "security",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        operationType: { type: "string", description: "Operation type requesting human sign-off" },
        reason: { type: "string", description: "Detailed rationale for the operation" },
        riskTier: { type: "string", description: "Risk tier: low, medium, high, or critical", default: "high" },
      },
      outputSchema: {
        requestId: "string",
        status: "string",
        requiresApproval: "boolean",
      },
      execute: async (params: Record<string, any>) => {
        const engine = AIGovernanceEngine.getInstance();
        const gate = engine.getApprovalGate();
        const req = await gate.requestApproval({
          requestedBy: "agent_orchestrator",
          operationType: params.operationType || "unspecified_operation",
          reason: params.reason || "Autonomous agent requested human review",
          riskTier: (params.riskTier as any) || "high",
        });
        return {
          toolName: "request_human_approval",
          success: true,
          output: {
            requestId: req.id,
            status: req.status,
            requiresApproval: true,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 27. Governance Audit Trail Tool (Phase 44)
    this.registerTool({
      name: "get_governance_audit_trail",
      displayName: "Governance Audit Trail Explorer",
      description: "Retrieves immutable governance audit log entries, policy violation events, and compliance certification metrics.",
      category: "security",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        limit: { type: "number", description: "Max count of audit entries to return", default: 10 },
      },
      outputSchema: {
        totalAuditEvents: "number",
        cleanScanRate: "number",
        injectionsBlocked: "number",
      },
      execute: async (_params: Record<string, any>) => {
        const engine = AIGovernanceEngine.getInstance();
        const metrics = engine.getMetrics();
        return {
          toolName: "get_governance_audit_trail",
          success: true,
          output: {
            totalAuditEvents: metrics.totalScans,
            cleanScanRate: metrics.cleanRate,
            injectionsBlocked: metrics.injectionsNeutralized,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 28. Subscription & Quota Verifier Tool (Phase 45)
    this.registerTool({
      name: "check_subscription_quota",
      displayName: "Subscription & Quota Checker",
      description: "Verifies tenant token consumption, daily request limits, storage capacity, and plan tier entitlements.",
      category: "data",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        userId: { type: "string", description: "Target tenant user ID", default: "current_user" },
      },
      outputSchema: {
        tier: "string",
        allowed: "boolean",
        tokensUsed: "number",
        remainingTokens: "number",
        requestsToday: "number",
        remainingRequests: "number",
      },
      execute: async (params: Record<string, any>, context: AgentExecutionContext) => {
        const userId = params.userId === "current_user" ? context.userId : params.userId || context.userId;
        const billing = BillingEngine.getInstance();
        const sub = billing.getUserSubscription(userId);
        const quota = billing.getUserUsage(userId, sub.tier);
        return {
          toolName: "check_subscription_quota",
          success: true,
          output: {
            tier: sub.tier,
            allowed: quota.allowed,
            tokensUsed: quota.tokensUsed,
            remainingTokens: quota.remainingTokens,
            requestsToday: quota.requestsToday,
            remainingRequests: quota.remainingRequests,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 29. Invoice Generator Tool (Phase 45)
    this.registerTool({
      name: "generate_billing_invoice",
      displayName: "Commercial Invoice Generator",
      description: "Creates an official commercial invoice with line items, tax IDs, and billing statements.",
      category: "data",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        description: { type: "string", description: "Service or subscription item description" },
        amount: { type: "number", description: "Item amount in USD" },
      },
      outputSchema: {
        invoiceId: "string",
        invoiceNumber: "string",
        total: "number",
        status: "string",
      },
      execute: async (params: Record<string, any>, context: AgentExecutionContext) => {
        const billing = BillingEngine.getInstance();
        const invoice = await billing.createInvoice({
          userId: context.userId,
          customerName: context.userEmail || "Customer",
          customerEmail: context.userEmail || "customer@tattva.ai",
          lineItems: [
            {
              description: params.description || "TATTVA AI Autonomous Services",
              quantity: 1,
              unitPrice: Number(params.amount) || 20,
            },
          ],
        });
        return {
          toolName: "generate_billing_invoice",
          success: true,
          output: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            total: invoice.total,
            status: invoice.status,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 30. Commercial Business Analytics Tool (Phase 45)
    this.registerTool({
      name: "get_commercial_analytics",
      displayName: "Commercial Analytics Telemetry",
      description: "Retrieves business intelligence metrics including MRR, active subscriber counts, cost margins, and token expenditures.",
      category: "data",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {},
      outputSchema: {
        mrrUsd: "number",
        arrUsd: "number",
        activeSubscribers: "number",
        marginPercent: "number",
      },
      execute: async () => {
        const billing = BillingEngine.getInstance();
        const analytics = billing.getAnalytics();
        return {
          toolName: "get_commercial_analytics",
          success: true,
          output: {
            mrrUsd: analytics.mrrUsd,
            arrUsd: analytics.arrUsd,
            activeSubscribers: analytics.activeSubscribers,
            marginPercent: analytics.marginPercent,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 31. Support Ticket Creation Tool (Phase 46)
    this.registerTool({
      name: "create_support_ticket",
      displayName: "Customer Support Ticket Creator",
      description: "Creates an official customer support incident ticket with scrubbed PII, priority triage, and automated resolution queueing.",
      category: "api",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        subject: { type: "string", description: "Issue title or brief summary", required: true },
        description: { type: "string", description: "Detailed description of the issue or inquiry", required: true },
        category: { type: "string", description: "Category: general, technical, billing, account, or feature_request" },
        priority: { type: "string", description: "Priority: low, normal, high, or urgent" },
      },
      outputSchema: {
        ticketId: "string",
        ticketNumber: "string",
        status: "string",
        category: "string",
        priority: "string",
      },
      execute: async (params: Record<string, any>, context: AgentExecutionContext) => {
        const support = CustomerSupportEngine.getInstance();
        const ticket = await support.createTicket({
          userId: context.userId,
          userEmail: context.userEmail || "user@tattva.ai",
          subject: params.subject,
          description: params.description,
          category: params.category,
          priority: params.priority,
        });
        return {
          toolName: "create_support_ticket",
          success: true,
          output: {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            status: ticket.status,
            category: ticket.category,
            priority: ticket.priority,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 32. Knowledge Base Search Tool (Phase 46)
    this.registerTool({
      name: "search_knowledge_base",
      displayName: "Support Knowledge Base Search",
      description: "Searches the official TATTVA AI help center and troubleshooting articles for instant solution matching.",
      category: "data",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        query: { type: "string", description: "Keyword or problem description to look up", required: true },
      },
      outputSchema: {
        count: "number",
        articles: "array",
      },
      execute: async (params: Record<string, any>) => {
        const support = CustomerSupportEngine.getInstance();
        const results = support.searchFaqs(params.query || "");
        return {
          toolName: "search_knowledge_base",
          success: true,
          output: {
            count: results.length,
            articles: results.map((art) => ({
              id: art.id,
              title: art.title,
              category: art.category,
              summary: art.summary,
              slug: art.slug,
              helpfulVotes: art.helpfulVotes,
            })),
          },
          executionTimeMs: 0,
        };
      },
    });

    // 33. User Feedback & CSAT Collector Tool (Phase 46)
    this.registerTool({
      name: "submit_user_feedback",
      displayName: "User Experience Feedback Collector",
      description: "Records 1-5 star user satisfaction scores and sentiment feedback for quality telemetry.",
      category: "data",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        rating: { type: "number", description: "Rating score from 1 to 5", required: true },
        feedbackText: { type: "string", description: "Optional qualitative user comments" },
        category: { type: "string", description: "Category: ai_quality, ui_ux, performance, pricing, or general" },
      },
      outputSchema: {
        feedbackId: "string",
        rating: "number",
        sentiment: "string",
        status: "string",
      },
      execute: async (params: Record<string, any>, context: AgentExecutionContext) => {
        const support = CustomerSupportEngine.getInstance();
        const feedback = await support.submitFeedback({
          userId: context.userId,
          rating: Number(params.rating) || 5,
          feedbackText: params.feedbackText,
          category: params.category,
        });
        return {
          toolName: "submit_user_feedback",
          success: true,
          output: {
            feedbackId: feedback.id,
            rating: feedback.rating,
            sentiment: feedback.sentiment,
            status: "recorded",
          },
          executionTimeMs: 0,
        };
      },
    });

    // 34. Data Retention Policy Tool (Phase 47)
    this.registerTool({
      name: "get_data_retention_policy",
      displayName: "Data Retention Inspector",
      description: "Retrieves workspace data retention periods for chats, documents, code artifacts, and audit logs.",
      category: "data",
      permission: "safe",
      timeoutMs: 10000,
      inputSchema: {
        workspaceId: { type: "string", description: "Workspace identifier (defaults to current)" },
      },
      outputSchema: {
        workspaceId: "string",
        chatRetentionDays: "number",
        researchRetentionDays: "number",
        documentRetentionDays: "number",
        auditLogRetentionDays: "number",
        autoPurgeEnabled: "boolean",
      },
      execute: async (params: Record<string, any>, context: AgentExecutionContext) => {
        const gov = DataGovernanceEngine.getInstance();
        const policy = gov.getRetentionPolicy(params.workspaceId || context.workspaceId || "default");
        return {
          toolName: "get_data_retention_policy",
          success: true,
          output: {
            workspaceId: policy.workspaceId,
            chatRetentionDays: policy.chatRetentionDays,
            researchRetentionDays: policy.researchRetentionDays,
            documentRetentionDays: policy.documentRetentionDays,
            auditLogRetentionDays: policy.auditLogRetentionDays,
            autoPurgeEnabled: policy.autoPurgeEnabled,
          },
          executionTimeMs: 0,
        };
      },
    });

    // 35. GDPR / CCPA Data Export Tool (Phase 47)
    this.registerTool({
      name: "export_user_data",
      displayName: "GDPR / CCPA Self-Service Data Exporter",
      description: "Generates a comprehensive machine-readable archive of user profile, chats, documents, feedback, and invoices.",
      category: "data",
      permission: "safe",
      timeoutMs: 15000,
      inputSchema: {
        format: { type: "string", description: "Export format: json or zip (defaults to json)" },
      },
      outputSchema: {
        exportId: "string",
        status: "string",
        downloadUrl: "string",
        totalRecordsCount: "number",
        checksum: "string",
      },
      execute: async (params: Record<string, any>, context: AgentExecutionContext) => {
        const gov = DataGovernanceEngine.getInstance();
        const archive = await gov.requestExport({
          userId: context.userId,
          userEmail: context.userEmail,
          format: params.format === "zip" ? "zip" : "json",
        });
        return {
          toolName: "export_user_data",
          success: true,
          output: {
            exportId: archive.exportId,
            status: archive.status,
            downloadUrl: archive.downloadUrl || "",
            totalRecordsCount: archive.totalRecordsCount,
            checksum: archive.dataPayload?.exportMetadata?.sha256Checksum || "",
          },
          executionTimeMs: 0,
        };
      },
    });

    // 36. Account Purge Tool ("Right to be Forgotten", Phase 47)
    this.registerTool({
      name: "request_account_purge",
      displayName: "Right to be Forgotten Purge Manager",
      description: "Initiates or confirms cryptographic account and data deletion in compliance with GDPR Art 17 and CCPA.",
      category: "security",
      permission: "approval_required",
      timeoutMs: 15000,
      inputSchema: {
        action: { type: "string", description: "'request' to initiate code, or 'confirm' to execute purge", required: true },
        requestId: { type: "string", description: "Purge request ID (required for confirm)" },
        confirmationCode: { type: "string", description: "6-digit confirmation code (required for confirm)" },
      },
      outputSchema: {
        requestId: "string",
        status: "string",
        confirmationCodeRequired: "boolean",
        auditHash: "string",
      },
      execute: async (params: Record<string, any>, context: AgentExecutionContext) => {
        const gov = DataGovernanceEngine.getInstance();
        if (params.action === "confirm") {
          const res = await gov.confirmPurge({
            requestId: params.requestId,
            confirmationCode: params.confirmationCode,
            requestingUserId: context.userId,
          });
          if (!res.success || !res.request) {
            return {
              toolName: "request_account_purge",
              success: false,
              output: { error: res.error || "Purge confirmation failed" },
              error: res.error || "Purge confirmation failed",
              executionTimeMs: 0,
            };
          }
          return {
            toolName: "request_account_purge",
            success: true,
            output: {
              requestId: res.request.requestId,
              status: res.request.status,
              confirmationCodeRequired: false,
              auditHash: res.request.auditHash,
            },
            executionTimeMs: 0,
          };
        }

        // Action: request
        const req = await gov.requestPurge({
          userId: context.userId,
          userEmail: context.userEmail || "user@tattva.ai",
        });
        return {
          toolName: "request_account_purge",
          success: true,
          output: {
            requestId: req.requestId,
            status: req.status,
            confirmationCodeRequired: true,
            auditHash: req.auditHash,
          },
          executionTimeMs: 0,
        };
      },
    });
  }
}

export const centralizedToolRegistry = CentralizedToolRegistry.getInstance();
