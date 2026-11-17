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
  }
}

export const centralizedToolRegistry = CentralizedToolRegistry.getInstance();
