/**
 * TATTVA AI - Complex Task Decomposition Engine
 * Breaks multi-part enterprise goals into ordered, dependency-mapped subtasks
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  TaskDecompositionResult,
  SubtaskPlanItem,
  ComplexTaskPlan,
  StructuredDeliverable,
} from "./schema";

export class TaskDecomposer {
  private static instance: TaskDecomposer;

  public static getInstance(): TaskDecomposer {
    if (!TaskDecomposer.instance) {
      TaskDecomposer.instance = new TaskDecomposer();
    }
    return TaskDecomposer.instance;
  }

  /**
   * Generates a structured multi-deliverable plan for practical, multi-part real-world goals
   */
  public decomposeComplexPlan(prompt: string, entities: string[], complexityScore: number): ComplexTaskPlan {
    const lower = prompt.toLowerCase();
    const deliverables: StructuredDeliverable[] = [];
    const executionSteps: SubtaskPlanItem[] = [];
    let step = 1;

    // 1. Identify Domain
    let domain: ComplexTaskPlan["domain"] = "general";
    if (
      lower.includes("college project") ||
      lower.includes("java project") ||
      lower.includes("software") ||
      lower.includes("full-stack") ||
      lower.includes("web app") ||
      lower.includes("database") ||
      lower.includes("code") ||
      lower.includes("lost and found")
    ) {
      domain = "software_engineering";
    } else if (
      lower.includes("research") ||
      lower.includes("compare the major") ||
      lower.includes("literature review") ||
      lower.includes("renewable energy") ||
      lower.includes("study")
    ) {
      domain = "academic_research";
    } else if (
      lower.includes("excel") ||
      lower.includes("dataset") ||
      lower.includes("data analysis") ||
      lower.includes("patterns") ||
      lower.includes("csv") ||
      lower.includes("analytics")
    ) {
      domain = "data_analytics";
    } else if (
      lower.includes("image") ||
      lower.includes("video") ||
      lower.includes("artwork") ||
      lower.includes("poster")
    ) {
      domain = "multimedia_creative";
    }

    // 2. Identify Programming Language & Concepts (for software domain)
    let programmingLanguage: string | undefined = undefined;
    if (/\b(java)\b/i.test(lower)) programmingLanguage = "Java";
    else if (/\b(python|py)\b/i.test(lower)) programmingLanguage = "Python";
    else if (/\b(typescript|ts|javascript|js|react|next\.js)\b/i.test(lower)) programmingLanguage = "TypeScript / React";
    else if (/\b(c\+\+|cpp)\b/i.test(lower)) programmingLanguage = "C++";
    else if (/\b(golang|go)\b/i.test(lower)) programmingLanguage = "Go";
    else if (/\b(sql|database)\b/i.test(lower)) programmingLanguage = "SQL / Database";

    const technicalConcepts: string[] = [];
    if (lower.includes("collection") || lower.includes("collections") || lower.includes("arraylist") || lower.includes("hashmap")) {
      technicalConcepts.push("Java Collections Framework (List, Map, Set, ArrayList, HashMap)");
    }
    if (lower.includes("oop") || lower.includes("object oriented") || lower.includes("inheritance") || lower.includes("polymorphism")) {
      technicalConcepts.push("Object-Oriented Programming (OOP) Principles & Encapsulation");
    }
    if (lower.includes("mvc") || lower.includes("architecture")) {
      technicalConcepts.push("Model-View-Controller (MVC) Modular Architecture");
    }
    if (lower.includes("exception") || lower.includes("error handling")) {
      technicalConcepts.push("Robust Exception Handling & Input Validation");
    }

    // 3. Identify Database Requirement
    let databaseRequirement: string | undefined = undefined;
    if (lower.includes("database") || lower.includes("connect a database") || lower.includes("sql") || lower.includes("mysql") || lower.includes("sqlite")) {
      databaseRequirement = "Relational database schema with primary/foreign keys and JDBC/SQL connection layer";
      deliverables.push({
        name: "Database Schema & Seeds",
        type: "schema",
        format: "sql",
        description: "Normalized relational DDL tables, indexes, and initial seed records",
      });
    }

    // 4. Identify Documentation Requirement
    let documentationRequirement: string | undefined = undefined;
    if (lower.includes("documentation") || lower.includes("document") || lower.includes("report") || lower.includes("manual")) {
      documentationRequirement = "Comprehensive technical documentation covering system architecture, ER diagrams, and user guide";
      deliverables.push({
        name: "Project Technical Report & Architecture Specification",
        type: "documentation",
        format: "docx",
        description: "Structured executive summary, architecture diagram, methodology, and module specifications",
      });
    }

    // 5. Identify Presentation Requirement
    let presentationRequirement: string | undefined = undefined;
    if (lower.includes("presentation") || lower.includes("slides") || lower.includes("powerpoint") || lower.includes("pptx")) {
      presentationRequirement = "Multi-slide presentation deck covering project objectives, architecture, workflow demo, and conclusion";
      deliverables.push({
        name: "Project Presentation Slide Deck",
        type: "presentation",
        format: "pptx",
        description: "Executive presentation with problem statement, architecture diagram, live features, and outcomes",
      });
    }

    // 6. Source Code Deliverable
    if (domain === "software_engineering" || lower.includes("code") || lower.includes("project")) {
      deliverables.unshift({
        name: `${programmingLanguage || "Software"} Core Source Code & Structure`,
        type: "code",
        format: programmingLanguage ? programmingLanguage.toLowerCase().replace(/[^a-z]/g, "") : "zip",
        description: "Complete, production-ready runnable source files with zero placeholders",
      });
    }

    // 7. Research Deliverables
    if (domain === "academic_research") {
      if (!deliverables.some((d) => d.type === "report" || d.type === "documentation")) {
        deliverables.push({
          name: "Comprehensive Research & Comparative Analysis Dossier",
          type: "report",
          format: "docx",
          description: "Structured comparison of major approaches, trade-offs, empirical benchmarks, and citations",
        });
      }
    }

    // 8. Data Analysis Deliverables
    if (domain === "data_analytics") {
      deliverables.push({
        name: "Statistical Pattern Analysis & Chart Dashboard",
        type: "spreadsheet",
        format: "xlsx",
        description: "Multi-tab analytical workbook with dynamic summary formulas and chart visualizations",
      });
    }

    // 9. Build Development Dependencies
    const developmentDependencies: string[] = [];
    if (programmingLanguage === "Java") {
      developmentDependencies.push("JDK 17 or later", "Maven / Gradle Build Tool", "JDBC Driver (MySQL / SQLite)", "JUnit 5 for unit testing");
    } else if (programmingLanguage === "Python") {
      developmentDependencies.push("Python 3.10+", "pip / poetry", "pytest", "SQLAlchemy / SQLite");
    } else if (programmingLanguage?.includes("TypeScript")) {
      developmentDependencies.push("Node.js v20+", "npm / pnpm", "Next.js 15 / React 19", "Tailwind CSS v4");
    }

    // 10. Generate Dependency-Mapped Execution Steps
    if (domain === "software_engineering") {
      executionSteps.push({
        stepNumber: step++,
        title: "Requirement Clarification & Architecture Decomposition",
        description: `Map data structures, business rules, and entities for ${programmingLanguage || "software"} implementation.`,
        dependencies: [],
        recommendedCapability: "architecture_planning",
      });
      if (databaseRequirement) {
        executionSteps.push({
          stepNumber: step++,
          title: "Database Modeling & Schema Definition",
          description: "Design 3NF relational tables, constraints, foreign keys, and indexes.",
          dependencies: [1],
          recommendedCapability: "database_design",
        });
      }
      executionSteps.push({
        stepNumber: step++,
        title: "Core Domain Implementation & Collections Logic",
        description: `Implement object models and business controllers using ${technicalConcepts.join(", ") || "clean architecture"}.`,
        dependencies: databaseRequirement ? [1, 2] : [1],
        recommendedCapability: "backend_specialist",
      });
      if (documentationRequirement) {
        executionSteps.push({
          stepNumber: step++,
          title: "Technical Documentation Generation",
          description: "Compile executive summary, component diagrams, API specs, and setup instructions into a formal report.",
          dependencies: [step - 2],
          recommendedCapability: "document_engine",
        });
      }
      if (presentationRequirement) {
        executionSteps.push({
          stepNumber: step++,
          title: "Presentation Slides Synthesis",
          description: "Synthesize problem statement, system architecture, feature highlights, and future scope into PPTX slides.",
          dependencies: [step - 2],
          recommendedCapability: "presentation_engine",
        });
      }
      executionSteps.push({
        stepNumber: step++,
        title: "Automated Code Verification & Artifact Validation",
        description: "Verify compilation integrity, syntax validities, file existence, and output completeness.",
        dependencies: [step - 2],
        recommendedCapability: "testing_specialist",
      });
    } else if (domain === "academic_research") {
      executionSteps.push({
        stepNumber: step++,
        title: "Research Scope Definition & Query Formulation",
        description: "Isolate central research questions, technology paradigms, and comparison criteria.",
        dependencies: [],
        recommendedCapability: "architecture_planning",
      });
      executionSteps.push({
        stepNumber: step++,
        title: "Authoritative Literature Retrieval & Evidence Collection",
        description: "Search verified academic and industry documentation to gather grounded data points.",
        dependencies: [1],
        recommendedCapability: "web_search",
      });
      executionSteps.push({
        stepNumber: step++,
        title: "Comparative Analysis & Trade-Off Synthesis",
        description: "Structure comparative matrices across performance, scalability, cost, and limitations.",
        dependencies: [1, 2],
        recommendedCapability: "reasoning_engine",
      });
      executionSteps.push({
        stepNumber: step++,
        title: "Formal Research Report & Citation Compilation",
        description: "Author comprehensive document with grounded citations and executive takeaways.",
        dependencies: [2, 3],
        recommendedCapability: "document_engine",
      });
      if (presentationRequirement) {
        executionSteps.push({
          stepNumber: step++,
          title: "Executive Presentation Deck Creation",
          description: "Prepare presentation slides summarizing major approaches and research conclusions.",
          dependencies: [3, 4],
          recommendedCapability: "presentation_engine",
        });
      }
    } else {
      // General or Data Analytics plan
      executionSteps.push({
        stepNumber: step++,
        title: "Task Scope Analysis",
        description: `Analyze requirements and constraints for ${prompt.slice(0, 80)}.`,
        dependencies: [],
        recommendedCapability: "architecture_planning",
      });
      executionSteps.push({
        stepNumber: step++,
        title: "Execution & Data Transformation",
        description: "Process inputs, execute necessary computations or data analyses.",
        dependencies: [1],
        recommendedCapability: "data_calculator",
      });
      executionSteps.push({
        stepNumber: step++,
        title: "Result Verification & Delivery Synthesis",
        description: "Verify calculations, compile deliverables, and formulate final response.",
        dependencies: [1, 2],
        recommendedCapability: "testing_specialist",
      });
    }

    const isComplex = deliverables.length >= 2 || executionSteps.length >= 4 || complexityScore >= 6;

    return {
      isComplex,
      domain,
      projectRequirements: [prompt],
      programmingLanguage,
      technicalConcepts,
      databaseRequirement,
      documentationRequirement,
      presentationRequirement,
      developmentDependencies,
      deliverables,
      executionSteps,
    };
  }

  public decompose(prompt: string, entities: string[], complexityScore: number): TaskDecompositionResult {
    const complexPlan = this.decomposeComplexPlan(prompt, entities, complexityScore);
    if (complexPlan.isComplex && complexPlan.executionSteps.length > 0) {
      return {
        isMultiStep: true,
        subtasks: complexPlan.executionSteps,
      };
    }

    const lower = prompt.toLowerCase();
    const isComplexAppDev =
      (lower.includes("build") || lower.includes("develop") || lower.includes("create") || lower.includes("architecture")) &&
      (entities.length >= 3 || lower.includes("system") || lower.includes("platform") || lower.includes("application"));

    if (!isComplexAppDev && complexityScore < 7) {
      return {
        isMultiStep: false,
        subtasks: [],
      };
    }

    const subtasks: SubtaskPlanItem[] = [];
    let step = 1;

    // Step 1: Requirements & Architecture
    subtasks.push({
      stepNumber: step++,
      title: "System Architecture & Requirements Analysis",
      description: `Analyze functional objectives, boundary conditions, and tech stack for ${entities.slice(0, 3).join(", ") || "the project"}.`,
      dependencies: [],
      recommendedCapability: "architecture_planning",
    });

    // Step 2: Database Schema
    if (entities.some((e) => ["student", "user", "order", "product", "patient", "database", "sql"].includes(e)) || lower.includes("database")) {
      subtasks.push({
        stepNumber: step++,
        title: "Relational Database Schema & Data Models",
        description: "Design normalized database tables, primary/foreign keys, and indexes.",
        dependencies: [1],
        recommendedCapability: "database_design",
      });
    }

    // Step 3: Authentication & Security
    if (lower.includes("login") || lower.includes("auth") || lower.includes("user") || lower.includes("security")) {
      subtasks.push({
        stepNumber: step++,
        title: "Authentication & Role-Based Access Control (RBAC)",
        description: "Implement secure session tokens, password hashing, and endpoint authorization.",
        dependencies: [step - 2],
        recommendedCapability: "security_engineering",
      });
    }

    // Step 4: Core Domain CRUD & Logic
    subtasks.push({
      stepNumber: step++,
      title: "Core Business Logic & API Endpoints",
      description: `Implement verified handlers and logic for ${entities.slice(0, 4).join(", ") || "core services"}.`,
      dependencies: [step - 2],
      recommendedCapability: "backend_specialist",
    });

    // Step 5: Frontend Interface / Dashboard
    if (lower.includes("app") || lower.includes("website") || lower.includes("ui") || lower.includes("dashboard") || lower.includes("frontend")) {
      subtasks.push({
        stepNumber: step++,
        title: "Responsive Frontend Interface & UI Components",
        description: "Construct accessible dark-mode UI with interactive controls, forms, and validation.",
        dependencies: [step - 2],
        recommendedCapability: "ui_ux_specialist",
      });
    }

    // Step 6: Testing & Verification
    subtasks.push({
      stepNumber: step++,
      title: "Automated Testing, Verification & Hardening",
      description: "Validate inputs, edge cases, error codes, and end-to-end user workflows.",
      dependencies: [step - 2],
      recommendedCapability: "testing_specialist",
    });

    return {
      isMultiStep: true,
      subtasks,
    };
  }
}

export const taskDecomposer = TaskDecomposer.getInstance();
