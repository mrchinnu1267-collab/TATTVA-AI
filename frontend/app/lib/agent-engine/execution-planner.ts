/**
 * TATTVA AI - Dynamic Execution Planner & Dependency Graph Engine
 * Advanced task decomposition, DAG acyclic validation via Kahn's Algorithm,
 * parallel execution tier scheduling, dynamic variable binding, and checkpoint serialization.
 * 
 * Conceptualized & Engineered for TATTVA AI Autonomous Agent Platform
 */

import { TaskStep, StepState, AgentSubrole } from "./types";

export interface ExecutionNode {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  assignedAgent: AgentSubrole;
  toolToUse?: string;
  toolParameters?: Record<string, any>;
  inputBindings?: Record<string, string>; // e.g. { "query": "{{step_1.output.summary}}" }
  dependencies: string[];
  status: StepState;
  requiresApproval: boolean;
  approvalReason?: string;
  output?: any;
  error?: string;
  durationMs?: number;
}

export interface ExecutionDAG {
  planId: string;
  objective: string;
  nodes: Record<string, ExecutionNode>;
  executionTiers: string[][]; // Topological execution tiers (nodes in same tier execute in parallel)
  isAcyclic: boolean;
  totalNodes: number;
  estimatedDurationMs: number;
  requiresApproval: boolean;
  approvalReasons: string[];
}

export interface ExecutionCheckpoint {
  checkpointId: string;
  planId: string;
  dag: ExecutionDAG;
  completedCount: number;
  totalCount: number;
  timestamp: number;
  serializedState: string;
}

export class DynamicExecutionPlanner {
  private static instance: DynamicExecutionPlanner;
  private checkpoints: Map<string, ExecutionCheckpoint> = new Map();

  private constructor() {}

  public static getInstance(): DynamicExecutionPlanner {
    if (!DynamicExecutionPlanner.instance) {
      DynamicExecutionPlanner.instance = new DynamicExecutionPlanner();
    }
    return DynamicExecutionPlanner.instance;
  }

  /**
   * Deconstructs a high-level user objective into a DAG with dependency tiers and variable bindings
   */
  public planGoal(objective: string, constraints: string[] = []): ExecutionDAG {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const lower = objective.toLowerCase();
    const nodes: Record<string, ExecutionNode> = {};

    // 1. Domain-specific decomposition logic
    if (
      lower.includes("spreadsheet") ||
      lower.includes("excel") ||
      lower.includes("csv") ||
      lower.includes("dataset") ||
      lower.includes("eda") ||
      lower.includes("presentation") ||
      lower.includes("report")
    ) {
      // Multi-step Data -> Statistics -> Visualization -> Executive Dossier
      nodes["step_1_ingest"] = {
        id: "step_1_ingest",
        stepNumber: 1,
        title: "Ingest & Validate Tabular Data",
        description: "Parse dataset structure, extract schema headers, and check for missing values",
        assignedAgent: "data_analysis",
        toolToUse: "data_calculator",
        toolParameters: { expression: "describe_dataset" },
        dependencies: [],
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_2_stats"] = {
        id: "step_2_stats",
        stepNumber: 2,
        title: "Compute Statistical Metrics & Outliers",
        description: "Calculate distributions, correlation matrices, and outlier boundaries",
        assignedAgent: "mathematics",
        toolToUse: "data_calculator",
        toolParameters: { mode: "summary_statistics" },
        inputBindings: { inputData: "{{step_1_ingest.output.summary}}" },
        dependencies: ["step_1_ingest"],
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_2_chart"] = {
        id: "step_2_chart",
        stepNumber: 2,
        title: "Generate Visual Charts & Plots",
        description: "Plot distribution charts and trend graphs from processed data",
        assignedAgent: "programming",
        toolToUse: "chart_generator",
        toolParameters: { chartType: "bar", title: "Metrics Distribution" },
        inputBindings: { seriesData: "{{step_1_ingest.output.series}}" },
        dependencies: ["step_1_ingest"], // Can run in parallel with step_2_stats!
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_3_synthesis"] = {
        id: "step_3_synthesis",
        stepNumber: 3,
        title: "Compile Executive Dossier & Presentation Deck",
        description: "Synthesize statistics and charts into a business presentation with actionable insights",
        assignedAgent: "document",
        toolToUse: "document_generator",
        toolParameters: { documentType: "presentation", topic: objective.slice(0, 100) },
        inputBindings: {
          statistics: "{{step_2_stats.output.metrics}}",
          charts: "{{step_2_chart.output.chartUrl}}",
        },
        dependencies: ["step_2_stats", "step_2_chart"],
        status: "PENDING",
        requiresApproval: false,
      };
    } else if (
      lower.includes("github") ||
      lower.includes("repository") ||
      lower.includes("codebase") ||
      lower.includes("audit") ||
      lower.includes("refactor")
    ) {
      // Code Inspection & Security Audit DAG
      nodes["step_1_inspect"] = {
        id: "step_1_inspect",
        stepNumber: 1,
        title: "Inspect Codebase & AST Structure",
        description: "Scan repository directory tree, identify package dependencies, and analyze AST",
        assignedAgent: "programming",
        toolToUse: "repo_inspector",
        toolParameters: { repoPath: "./" },
        dependencies: [],
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_2_security"] = {
        id: "step_2_security",
        stepNumber: 2,
        title: "Perform Static AST Security Review",
        description: "Scan source code for injection vulnerabilities, token leaks, and insecure calls",
        assignedAgent: "security_review",
        toolToUse: "code_runner",
        toolParameters: { mode: "security_audit" },
        inputBindings: { targetFiles: "{{step_1_inspect.output.fileList}}" },
        dependencies: ["step_1_inspect"],
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_2_tests"] = {
        id: "step_2_tests",
        stepNumber: 2,
        title: "Execute Unit & Integration Test Suites",
        description: "Run automated tests to establish baseline reliability",
        assignedAgent: "testing",
        toolToUse: "code_runner",
        toolParameters: { command: "test" },
        dependencies: ["step_1_inspect"], // Runs in parallel with security review
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_3_remediate"] = {
        id: "step_3_remediate",
        stepNumber: 3,
        title: "Synthesize Audit Findings & Remediation Plan",
        description: "Deliver prioritized recommendations with verifiable patch snippets",
        assignedAgent: "planning",
        inputBindings: {
          vulnerabilities: "{{step_2_security.output.issues}}",
          testResults: "{{step_2_tests.output.summary}}",
        },
        dependencies: ["step_2_security", "step_2_tests"],
        status: "PENDING",
        requiresApproval: false,
      };
    } else if (
      lower.includes("research") ||
      lower.includes("investigate") ||
      lower.includes("compare") ||
      lower.includes("market")
    ) {
      // Multi-source Web Research & Consensus DAG
      nodes["step_1_search_a"] = {
        id: "step_1_search_a",
        stepNumber: 1,
        title: "Primary Web Discovery",
        description: "Query authoritative sources and retrieve latest whitepapers/articles",
        assignedAgent: "research",
        toolToUse: "web_search",
        toolParameters: { query: `${objective} latest specifications overview` },
        dependencies: [],
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_1_search_b"] = {
        id: "step_1_search_b",
        stepNumber: 1,
        title: "Comparative Benchmark Discovery",
        description: "Search industry benchmarks and independent evaluations",
        assignedAgent: "research",
        toolToUse: "web_search",
        toolParameters: { query: `${objective} comparative analysis benchmarks` },
        dependencies: [], // Runs concurrently with search_a
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_2_consensus"] = {
        id: "step_2_consensus",
        stepNumber: 2,
        title: "Cross-Source Consensus & Contradiction Resolution",
        description: "Verify claims across retrieved evidence and filter unverified data",
        assignedAgent: "research",
        inputBindings: {
          primaryFindings: "{{step_1_search_a.output.results}}",
          benchmarkFindings: "{{step_1_search_b.output.results}}",
        },
        dependencies: ["step_1_search_a", "step_1_search_b"],
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_3_dossier"] = {
        id: "step_3_dossier",
        stepNumber: 3,
        title: "Generate Grounded Research Dossier",
        description: "Formulate verified research report with explicit footnote citations",
        assignedAgent: "document",
        toolToUse: "document_generator",
        toolParameters: { documentType: "research_dossier" },
        inputBindings: { content: "{{step_2_consensus.output.consensus}}" },
        dependencies: ["step_2_consensus"],
        status: "PENDING",
        requiresApproval: false,
      };
    } else {
      // General Adaptive Autonomous Plan
      nodes["step_1_analyze"] = {
        id: "step_1_analyze",
        stepNumber: 1,
        title: "Context Analysis & Constraint Formulation",
        description: `Deconstruct user objective: "${objective.slice(0, 100)}"`,
        assignedAgent: "planning",
        dependencies: [],
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_2_execute"] = {
        id: "step_2_execute",
        stepNumber: 2,
        title: "Execute Core Domain Operation",
        description: "Dispatch tasks to domain specialist with tool verification",
        assignedAgent: "programming",
        toolToUse: "code_runner",
        toolParameters: { command: "run", code: `// Execution for: ${objective}` },
        dependencies: ["step_1_analyze"],
        status: "PENDING",
        requiresApproval: false,
      };

      nodes["step_3_verify"] = {
        id: "step_3_verify",
        stepNumber: 3,
        title: "Verify Outcomes & Deliverables",
        description: "Ensure deliverables fulfill all user requirements without errors",
        assignedAgent: "testing",
        inputBindings: { result: "{{step_2_execute.output}}" },
        dependencies: ["step_2_execute"],
        status: "PENDING",
        requiresApproval: false,
      };
    }

    // 2. Assess Risk & Human-In-The-Loop Approval Gates
    const riskAssessment = this.assessRisk(nodes, lower);

    // 3. Compute Topological Execution Tiers (Kahn's Algorithm)
    const { tiers, isAcyclic } = this.computeExecutionTiers(nodes);

    const totalNodes = Object.keys(nodes).length;
    const estimatedDurationMs = tiers.length * 3000;

    return {
      planId,
      objective,
      nodes,
      executionTiers: tiers,
      isAcyclic,
      totalNodes,
      estimatedDurationMs,
      requiresApproval: riskAssessment.requiresApproval,
      approvalReasons: riskAssessment.reasons,
    };
  }

  /**
   * Implements Kahn's Algorithm for Topological Sorting & Parallel Execution Tier Discovery
   * Detects cycles and groups nodes that can execute concurrently.
   */
  public computeExecutionTiers(nodes: Record<string, ExecutionNode>): {
    tiers: string[][];
    isAcyclic: boolean;
  } {
    const nodeIds = Object.keys(nodes);
    if (nodeIds.length === 0) {
      return { tiers: [], isAcyclic: true };
    }

    // Build in-degree map and adjacency list
    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};

    for (const id of nodeIds) {
      inDegree[id] = 0;
      adjacency[id] = [];
    }

    for (const id of nodeIds) {
      const deps = nodes[id].dependencies || [];
      for (const dep of deps) {
        if (nodes[dep]) {
          inDegree[id]++;
          adjacency[dep].push(id);
        }
      }
    }

    const tiers: string[][] = [];
    let currentTier = nodeIds.filter((id) => inDegree[id] === 0);
    let processedCount = 0;

    while (currentTier.length > 0) {
      tiers.push(currentTier);
      processedCount += currentTier.length;

      const nextTierCandidates: string[] = [];
      for (const u of currentTier) {
        for (const v of adjacency[u]) {
          inDegree[v]--;
          if (inDegree[v] === 0) {
            nextTierCandidates.push(v);
          }
        }
      }
      currentTier = nextTierCandidates;
    }

    const isAcyclic = processedCount === nodeIds.length;

    // If cycle detected, fallback to sequential order to avoid deadlocks
    if (!isAcyclic) {
      const fallbackTiers = nodeIds.map((id) => [id]);
      return { tiers: fallbackTiers, isAcyclic: false };
    }

    return { tiers, isAcyclic: true };
  }

  /**
   * Resolves dynamic input bindings like `{{step_1.output.summary}}` using completed upstream outputs
   */
  public resolveInputBindings(
    node: ExecutionNode,
    completedNodes: Record<string, ExecutionNode>
  ): Record<string, any> {
    const resolvedParams: Record<string, any> = { ...(node.toolParameters || {}) };

    if (!node.inputBindings) {
      return resolvedParams;
    }

    for (const [targetKey, templateExpr] of Object.entries(node.inputBindings)) {
      if (typeof templateExpr === "string") {
        const match = templateExpr.match(/^{{\s*([a-zA-Z0-9_-]+)\.output(?:\.([a-zA-Z0-9_.-]+))?\s*}}$/);
        if (match) {
          const upstreamId = match[1];
          const propertyPath = match[2];
          const upstream = completedNodes[upstreamId];

          if (upstream && upstream.output !== undefined) {
            if (!propertyPath) {
              resolvedParams[targetKey] = upstream.output;
            } else {
              // Traverse nested property path
              const parts = propertyPath.split(".");
              let val = upstream.output;
              for (const part of parts) {
                if (val && typeof val === "object" && part in val) {
                  val = val[part];
                } else {
                  val = undefined;
                  break;
                }
              }
              resolvedParams[targetKey] = val !== undefined ? val : `[Unresolved property: ${propertyPath}]`;
            }
          } else {
            resolvedParams[targetKey] = `[Pending output from: ${upstreamId}]`;
          }
        } else {
          resolvedParams[targetKey] = templateExpr;
        }
      } else {
        resolvedParams[targetKey] = templateExpr;
      }
    }

    return resolvedParams;
  }

  /**
   * Scans nodes and objectives for sensitive/destructive operations requiring Human-In-The-Loop approval
   */
  public assessRisk(
    nodes: Record<string, ExecutionNode>,
    goalText: string = ""
  ): { requiresApproval: boolean; reasons: string[] } {
    let requiresApproval = false;
    const reasons: string[] = [];

    const dangerousPatterns = [
      { pattern: /drop table|delete from|truncate/i, reason: "Destructive database alteration requested." },
      { pattern: /rm -rf|delete file|unlink|purge/i, reason: "Permanent file system deletion requested." },
      { pattern: /kill -9|pkill|terminate process/i, reason: "Host process termination requested." },
      { pattern: /send email|dispatch webhook|publish to/i, reason: "External communication or publication action." },
      { pattern: /sudo|chmod 777|grant all/i, reason: "Privilege escalation or permission modification." },
    ];

    for (const { pattern, reason } of dangerousPatterns) {
      if (pattern.test(goalText)) {
        requiresApproval = true;
        reasons.push(reason);
      }
    }

    for (const node of Object.values(nodes)) {
      const toolText = `${node.toolToUse || ""} ${JSON.stringify(node.toolParameters || {})}`;
      for (const { pattern, reason } of dangerousPatterns) {
        if (pattern.test(toolText) || pattern.test(node.description)) {
          node.requiresApproval = true;
          node.approvalReason = reason;
          requiresApproval = true;
          if (!reasons.includes(reason)) reasons.push(reason);
        }
      }
    }

    return { requiresApproval, reasons };
  }

  /**
   * Serializes current DAG state into a recovery checkpoint
   */
  public saveCheckpoint(dag: ExecutionDAG): ExecutionCheckpoint {
    const completedCount = Object.values(dag.nodes).filter((n) => n.status === "COMPLETED").length;
    const totalCount = dag.totalNodes;
    const checkpointId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const checkpoint: ExecutionCheckpoint = {
      checkpointId,
      planId: dag.planId,
      dag,
      completedCount,
      totalCount,
      timestamp: Date.now(),
      serializedState: JSON.stringify(dag),
    };

    this.checkpoints.set(checkpointId, checkpoint);
    this.checkpoints.set(`latest_${dag.planId}`, checkpoint);
    return checkpoint;
  }

  /**
   * Restores an ExecutionDAG from serialized checkpoint data
   */
  public restoreCheckpoint(checkpointData: string | ExecutionCheckpoint): ExecutionDAG {
    if (typeof checkpointData === "string") {
      const parsed = JSON.parse(checkpointData);
      return parsed.dag ? parsed.dag : (parsed as ExecutionDAG);
    }
    return checkpointData.dag;
  }

  /**
   * Retrieves the latest saved checkpoint for a given plan
   */
  public getLatestCheckpoint(planId: string): ExecutionCheckpoint | undefined {
    return this.checkpoints.get(`latest_${planId}`);
  }
}

export const dynamicExecutionPlanner = DynamicExecutionPlanner.getInstance();
