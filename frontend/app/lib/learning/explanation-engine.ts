/**
 * TATTVA AI - Concept Explanation & Analogy Engine
 * Calibrated depth breakdowns with intuitive mental models, formal rigor, and anti-patterns
 */

import {
  DifficultyLevel,
  SubjectDomain,
  ConceptExplanation,
} from "./types";

export class ExplanationEngine {
  /**
   * Generates a pedagogical breakdown of a concept calibrated to the learner's desired depth
   */
  public static explainConcept(
    concept: string,
    domain: SubjectDomain,
    level: DifficultyLevel = "intermediate"
  ): ConceptExplanation {
    const cleanConcept = concept.trim();
    const analogy = this.generateAnalogy(cleanConcept, domain, level);
    const overview = this.generateOverview(cleanConcept, domain, level);
    const keyPrinciples = this.generatePrinciples(cleanConcept, domain, level);
    const codeOrMathExample = this.generateExample(cleanConcept, domain, level);
    const commonPitfalls = this.generatePitfalls(cleanConcept, domain, level);
    const practicalUseCases = this.generateUseCases(cleanConcept, domain, level);
    const followUpQuestions = this.generateFollowUpQuestions(cleanConcept, domain, level);
    const suggestedPrerequisites = this.generatePrerequisites(cleanConcept, domain);

    return {
      concept: cleanConcept,
      domain,
      level,
      overview,
      analogy,
      keyPrinciples,
      codeOrMathExample,
      commonPitfalls,
      practicalUseCases,
      followUpQuestions,
      suggestedPrerequisites,
    };
  }

  private static generateAnalogy(concept: string, domain: SubjectDomain, level: DifficultyLevel): string {
    const cLower = concept.toLowerCase();

    if (cLower.includes("event loop") || cLower.includes("asynchronous") || cLower.includes("async")) {
      return "Imagine a busy restaurant kitchen with a single head chef (the single thread). When a customer orders a slow-cooked stew (I/O operation), the chef doesn't stand staring at the pot for 4 hours. Instead, they set a timer on the prep shelf and immediately cook other quick appetizers. When the timer dings (event callback queued), the chef plates the stew at the very first opportunity.";
    }
    if (cLower.includes("pointer") || cLower.includes("reference") || cLower.includes("memory")) {
      return "Think of computer memory like a giant apartment complex where every mailbox has a unique brass house number (memory address). A direct value is having the letter physically in your hand. A pointer or reference is holding a sticky note with that brass mailbox number written on it. You can pass the sticky note around efficiently without carrying the heavy parcel.";
    }
    if (cLower.includes("recursion") || cLower.includes("recurse")) {
      return "Recursion is like Russian Matryoshka nesting dolls. You open the outermost doll to find a slightly smaller version of the exact same doll inside. You keep unpacking until you finally uncover the solid, indivisible core doll that cannot be opened (the base case). Then you reassemble the dolls in reverse order on your way back out.";
    }
    if (cLower.includes("binary search") || cLower.includes("bsearch")) {
      return "Imagine searching for a word in an 800-page printed physical dictionary. You don't read from page 1 onwards. You open directly to page 400. If your word starts with 'S' and you landed on 'M', you instantaneously throw away the entire first half (pages 1-399) and repeat the process on the remaining half. You zero in on your target in only ~10 cuts.";
    }
    if (cLower.includes("matrix") || cLower.includes("eigen") || cLower.includes("linear transformation")) {
      return "Think of a 2D matrix transformation as stretching, shearing, or rotating a flat elastic rubber sheet with a grid drawn on it. Most arrows drawn on that sheet change both their length and their pointing direction. Eigenvectors are the special, steadfast arrows whose pointing direction remains invariant—they only get stretched or shrunk by a scaling factor known as the eigenvalue.";
    }
    if (cLower.includes("closure") || cLower.includes("lexical scope")) {
      return "A closure is like a backpack that a traveling function wears when it is created. Wherever that function wanders or whenever it gets called later across the codebase, it retains access to every sandwich, map, and flashlight that was packed inside that backpack from its birthplace.";
    }
    if (cLower.includes("cache") || cLower.includes("redis") || cLower.includes("lru")) {
      return "Caching is like keeping your current active notebook and pen directly on top of your work desk, rather than walking down three flights of stairs to the basement archives every time you need to look up a phone number.";
    }

    // Default pedagogical analogy
    return `Think of ${concept} as a modular power adapter system in electrical engineering. Instead of hardwiring every appliance directly to the wall fuse box, the adapter provides a standardized interface that decouples internal complexity from external consumers, enforcing invariants while maintaining flexibility.`;
  }

  private static generateOverview(concept: string, domain: SubjectDomain, level: DifficultyLevel): string {
    switch (level) {
      case "beginner":
        return `${concept} is a foundational building block in ${domain}. At its core, it gives engineers a reliable and structured way to solve problems by breaking complex tasks down into predictable, repeatable steps.`;
      case "intermediate":
        return `${concept} is an essential paradigm within ${domain}. It balances computational efficiency, readability, and structural abstraction, allowing systems to manage state, data flow, and invariants robustly.`;
      case "advanced":
        return `${concept} is a sophisticated mechanism in ${domain} designed for high throughput, algorithmic correctness, and minimal operational overhead. It directly affects memory locality, execution time complexity, and architectural modularity.`;
      case "expert":
        return `At the expert level, ${concept} represents a formal structural primitive in ${domain}. Mastery requires understanding underlying runtime semantics, hardware cache line behavior, asynchronous lock contention, and theoretical invariants under concurrency.`;
    }
  }

  private static generatePrinciples(concept: string, domain: SubjectDomain, level: DifficultyLevel): string[] {
    return [
      `Deterministic Boundary: Clearly defined input, state mutations, and output contracts.`,
      `Invariance & Safety: Enforces operational constraints so the system cannot enter an undefined or corrupt state.`,
      `Complexity Economics: Balances runtime time complexity with spatial memory allocations.`,
      `Composability: Integrates cleanly with surrounding libraries, pipelines, or mathematical transformations without leaking side-effects.`,
    ];
  }

  private static generateExample(concept: string, domain: SubjectDomain, level: DifficultyLevel): string {
    const cLower = concept.toLowerCase();

    if (domain === "mathematics" || cLower.includes("eigen") || cLower.includes("calculus") || cLower.includes("bayes")) {
      return [
        `// Formal Mathematical Representation:`,
        `Given linear operator A and non-zero vector v:`,
        `    A * v = λ * v`,
        `Rearranging for the characteristic polynomial:`,
        `    det(A - λ * I) = 0`,
        `Solving this determinant yields the eigenvalues {λ_i}.`,
      ].join("\n");
    }

    if (cLower.includes("search") || cLower.includes("binary")) {
      return [
        `function binarySearch(arr: number[], target: number): number {`,
        `  let left = 0;`,
        `  let right = arr.length - 1;`,
        ``,
        `  while (left <= right) {`,
        `    // Avoid integer overflow compared to (left + right) / 2`,
        `    const mid = left + Math.floor((right - left) / 2);`,
        `    if (arr[mid] === target) return mid;`,
        `    if (arr[mid] < target) left = mid + 1;`,
        `    else right = mid - 1;`,
        `  }`,
        `  return -1; // Target not found`,
        `}`,
      ].join("\n");
    }

    return [
      `// Idiomatic Implementation for ${concept}:`,
      `export class ${concept.replace(/[^a-zA-Z0-9]/g, "")}Manager<T> {`,
      `  private state: Map<string, T> = new Map();`,
      ``,
      `  public execute(key: string, compute: () => T): T {`,
      `    if (this.state.has(key)) {`,
      `      return this.state.get(key)!;`,
      `    }`,
      `    const result = compute();`,
      `    this.state.set(key, result);`,
      `    return result;`,
      `  }`,
      `}`,
    ].join("\n");
  }

  private static generatePitfalls(concept: string, domain: SubjectDomain, level: DifficultyLevel): string[] {
    return [
      `Premature Optimization: Sacrificing readability or introducing architectural overhead before profiling verified bottlenecks.`,
      `Ignoring Edge/Boundary Conditions: Failing to handle empty sets, null pointers, off-by-one indices, or network timeouts.`,
      `Hidden Mutation & Side-Effects: Mutating global or shared references, leading to non-reproducible race conditions.`,
      `Unbounded Resource Consumption: Allocating memory or event listeners without lifecycle tear-down or eviction limits.`,
    ];
  }

  private static generateUseCases(concept: string, domain: SubjectDomain, level: DifficultyLevel): string[] {
    return [
      `High-Scale Backend Services: Handling concurrent user requests without blocking runtime event loops.`,
      `Data Processing Pipelines: Streaming transformations where memory efficiency and throughput are critical.`,
      `Client UI State Synchronization: Ensuring responsive interactions with zero frame drops or unexpected re-renders.`,
    ];
  }

  private static generateFollowUpQuestions(concept: string, domain: SubjectDomain, level: DifficultyLevel): string[] {
    return [
      `How does ${concept} behave when inputs scale by 1000x?`,
      `What happens if a network partition or hardware fault occurs during execution?`,
      `Under what specific conditions would you intentionally choose an alternative approach over ${concept}?`,
    ];
  }

  private static generatePrerequisites(concept: string, domain: SubjectDomain): string[] {
    return [
      `Basic syntax and control flow in modern TypeScript/Python`,
      `Understanding of runtime call stacks and memory allocation`,
      `Asymptotic notation (Big O analysis)`,
    ];
  }
}
