/**
 * TATTVA AI - Requirement & Constraint Extraction Engine
 * Deconstructs user prompts into explicit instructions, implicit requirements, and technical constraints
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { ExpectedOutputSpec, OutputFormatType, OutputLengthType } from "./schema";

const ACTION_VERB_PATTERNS = [
  "build", "create", "develop", "design", "write", "generate", "implement",
  "connect", "integrate", "refactor", "debug", "fix", "optimize", "explain",
  "summarize", "analyze", "evaluate", "calculate", "export", "download", "format"
];

export class RequirementExtractor {
  private static instance: RequirementExtractor;

  public static getInstance(): RequirementExtractor {
    if (!RequirementExtractor.instance) {
      RequirementExtractor.instance = new RequirementExtractor();
    }
    return RequirementExtractor.instance;
  }

  public extract(
    prompt: string,
    contextConstraints: string[] = [],
    originalRawPrompt?: string
  ): {
    requiredActions: string[];
    explicitInstructions: string[];
    implicitRequirements: string[];
    constraints: string[];
    expectedOutput: ExpectedOutputSpec;
  } {
    const rawToCheck = originalRawPrompt || prompt;
    const lower = prompt.toLowerCase();
    const rawLower = rawToCheck.toLowerCase();
    const requiredActions: string[] = [];
    const explicitInstructions: string[] = [];
    const implicitRequirements: string[] = [];
    const constraints: string[] = [...contextConstraints];

    // 1. Extract required actions
    for (const verb of ACTION_VERB_PATTERNS) {
      const regex = new RegExp(`\\b${verb}\\b`, "i");
      if (regex.test(lower)) {
        requiredActions.push(verb);
      }
    }

    // 2. Extract explicit requirements from sentence clauses
    const clauses = prompt.split(/[,;\.\n]+|\band\b|\bwith\b/gi).map((c) => c.trim()).filter(Boolean);
    for (const c of clauses) {
      if (c.length > 5 && (c.includes("must") || c.includes("should") || c.includes("include") || c.includes("use") || c.includes("require"))) {
        explicitInstructions.push(c);
      }
    }

    // 3. Extract explicit constraints & negative constraints
    if (
      lower.includes("no placeholder") ||
      lower.includes("zero placeholder") ||
      lower.includes("without placeholder") ||
      lower.includes("without any placeholder") ||
      lower.includes("no todo") ||
      lower.includes("without any todo") ||
      lower.includes("without todos") ||
      lower.includes("100% complete")
    ) {
      constraints.push("Zero placeholders or unfinished code");
    }
    if (lower.includes("dark mode") || lower.includes("dark theme")) {
      constraints.push("Dark mode UI theme (#0B0F19 background, glassmorphism)");
    }
    if (lower.includes("single file") || lower.includes("self-contained")) {
      constraints.push("Single self-contained file with inline CSS/JS");
    }
    if (lower.includes("responsive") || lower.includes("mobile friendly")) {
      constraints.push("Mobile-responsive layout");
    }
    if (lower.includes("short") || lower.includes("concise") || lower.includes("briefly")) {
      constraints.push("Concise response without fluff");
    }
    if (lower.includes("in detail") || lower.includes("comprehensive") || lower.includes("deep dive")) {
      constraints.push("Comprehensive, in-depth technical analysis");
    }
    // Negative constraint parsing
    if (/\b(do not|don't|never|cannot|no)\s+([^,\.;\n]+)/i.test(lower)) {
      const matches = lower.matchAll(/\b(do not|don't|never|cannot)\s+([^,\.;\n]+)/gi);
      for (const m of matches) {
        constraints.push(`Prohibition: ${m[0].trim()}`);
      }
    }
    // Strict format constraint parsing
    if (/\b(strictly in|only respond in|must be strictly)\s+([^,\.;\n]+)/i.test(lower)) {
      const match = lower.match(/\b(strictly in|only respond in|must be strictly)\s+([^,\.;\n]+)/i);
      if (match) {
        constraints.push(`Format constraint: ${match[0].trim()}`);
      }
    }
    // Length bound constraint parsing
    if (/\b(maximum|max|under|at most|less than)\s+([0-9]+\s+[a-zA-Z]+)/i.test(lower)) {
      const match = lower.match(/\b(maximum|max|under|at most|less than)\s+([0-9]+\s+[a-zA-Z]+)/i);
      if (match) {
        constraints.push(`Length bound: ${match[0].trim()}`);
      }
    }

    // 4. Infer implicit requirements based on task domain
    if (lower.includes("login") || lower.includes("authentication") || lower.includes("auth")) {
      implicitRequirements.push("Secure session management & password hashing / token verification");
      implicitRequirements.push("Input validation for email and password fields");
    }
    if (lower.includes("student management") || lower.includes("crud") || lower.includes("records")) {
      implicitRequirements.push("Database schema design (tables, keys, relations)");
      implicitRequirements.push("CRUD handlers (Create, Read, Update, Delete)");
      implicitRequirements.push("Search and filtering capabilities");
    }
    if (lower.includes("chart") || lower.includes("analytics") || lower.includes("dashboard")) {
      implicitRequirements.push("Interactive data visualization charts");
      implicitRequirements.push("Key metric indicator cards (KPIs)");
    }
    if (lower.includes("api") || lower.includes("backend")) {
      implicitRequirements.push("HTTP error handling (400, 401, 404, 500)");
      implicitRequirements.push("Structured JSON request/response schema");
    }

    // 5. Determine expected output format and length
    const expectedOutput = this.determineOutputSpec(rawToCheck, lower);

    return {
      requiredActions: Array.from(new Set(requiredActions)),
      explicitInstructions: Array.from(new Set(explicitInstructions)),
      implicitRequirements: Array.from(new Set(implicitRequirements)),
      constraints: Array.from(new Set(constraints)),
      expectedOutput,
    };
  }

  private determineOutputSpec(rawPrompt: string, lower: string): ExpectedOutputSpec {
    let format: OutputFormatType = "structured_text";
    let length: OutputLengthType = "moderate";
    let isFinishedArtifact = false;
    let language = "en";
    const rawLower = rawPrompt.toLowerCase();

    // Format detection - structured formats prioritized over generic terms
    if (/\b(table|tabular|comparison table|matrix layout)\b/i.test(lower) || /\b(table|tabular)\b/i.test(rawLower)) {
      format = "table";
    } else if (/\b(json|schema|payload)\b/i.test(lower) || /\b(json)\b/i.test(rawLower)) {
      format = "json";
    } else if (/\b(docx|pdf|xlsx|pptx|csv|downloadable file|word doc|excel sheet|powerpoint)\b/i.test(lower) || /\b(docx|pdf|xlsx|pptx|csv)\b/i.test(rawLower)) {
      format = "document";
      isFinishedArtifact = true;
    } else if (/\b(draw|paint|generate an image|illustration|render)\b/i.test(lower) || /\b(image|draw)\b/i.test(rawLower)) {
      format = "image";
      isFinishedArtifact = true;
    } else if (/\b(step by step|steps|guide|tutorial|roadmap)\b/i.test(lower)) {
      format = "step_by_step";
    } else if (/\b(code|script|function|component|program|query|api|html|snippet|repository|implement|implementation|full-stack|app\.py)\b/i.test(lower) || /\b(code|rayi)\b/i.test(rawLower)) {
      format = "code";
    }

    // Length detection
    if (/\b(short|brief|concise|one line|in a sentence|quick summary)\b/i.test(lower) || /\b(short ga|brief ga)\b/i.test(rawLower)) {
      length = "concise";
    } else if (/\b(detailed|in-depth|deep dive|comprehensive|thorough|masterclass|exhaustively)\b/i.test(lower) || /\b(detail ga)\b/i.test(rawLower)) {
      length = "comprehensive";
    }

    // Language detection
    if (
      /[\u0C00-\u0C7F]/.test(rawPrompt) ||
      /\b(telugu|telugulo|cheppu|cheyyi|rayi|deeni|dini|idi)\b/i.test(rawLower) ||
      /\b(telugu|telugulo|cheppu|cheyyi|rayi|deeni|dini|idi)\b/i.test(lower)
    ) {
      language = rawLower.includes("english") || /[a-zA-Z]{4,}/.test(rawPrompt)
        ? "Telugu / English (Tenglish)"
        : "Telugu";
    } else if (
      /[\u0900-\u097F]/.test(rawPrompt) ||
      /\b(hindi|hindimein|batao|karo)\b/i.test(rawLower) ||
      /\b(hindi|hindimein|batao|karo)\b/i.test(lower)
    ) {
      language = rawLower.includes("english") || /[a-zA-Z]{4,}/.test(rawPrompt)
        ? "Hindi / English (Hinglish)"
        : "Hindi";
    }

    const requiresZeroPlaceholders =
      format === "code" ||
      format === "document" ||
      format === "json" ||
      lower.includes("production ready") ||
      lower.includes("endpoint") ||
      lower.includes("api");

    return {
      format,
      length,
      language,
      isFinishedArtifact,
      requiresZeroPlaceholders,
    };
  }
}

export const requirementExtractor = RequirementExtractor.getInstance();
