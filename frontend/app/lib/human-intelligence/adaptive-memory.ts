/**
 * TATTVA AI - Adaptive Memory & Project Context System
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface ProjectContextRecord {
  projectName?: string;
  technologies: string[];
  architecture?: string;
  activeTask?: string;
  lastProgressSummary?: string;
  solvedIssues: Array<{ issue: string; solution: string; timestamp: number }>;
  isConfirmedFact: boolean;
}

export class AdaptiveMemoryManager {
  /**
   * Extract non-sensitive project context from user and assistant turns
   */
  public static extractProjectContext(
    prompt: string,
    history: Array<{ role: string; content: string }> = []
  ): Partial<ProjectContextRecord> {
    const combined = [
      ...history.slice(-4).map((h) => h.content),
      prompt,
    ].join("\n");

    const technologies: string[] = [];
    const techPatterns = [
      { name: "Next.js", regex: /\b(next\.?js|next 1[4-6])\b/i },
      { name: "React", regex: /\b(react|react\.js)\b/i },
      { name: "TypeScript", regex: /\b(typescript|ts)\b/i },
      { name: "Python", regex: /\b(python|py)\b/i },
      { name: "Supabase", regex: /\b(supabase|postgres)\b/i },
      { name: "Tailwind CSS", regex: /\b(tailwind|tailwind css)\b/i },
      { name: "Node.js", regex: /\b(node|node\.js)\b/i },
      { name: "Docker", regex: /\b(docker|container)\b/i },
    ];

    for (const t of techPatterns) {
      if (t.regex.test(combined) && !technologies.includes(t.name)) {
        technologies.push(t.name);
      }
    }

    // Check project names or active features
    let activeTask: string | undefined;
    const taskMatch = prompt.match(/(?:working on|building|creating|developing|implementing)\s+([^.,\n]+)/i);
    if (taskMatch) {
      activeTask = taskMatch[1].trim();
    }

    return {
      technologies,
      activeTask,
      isConfirmedFact: Boolean(activeTask && prompt.includes("I am")),
    };
  }

  /**
   * Format memory context safely into system instructions without exposing secrets
   */
  public static formatProjectContextForPrompt(context: Partial<ProjectContextRecord>): string {
    const sections: string[] = [];

    if (context.activeTask) {
      sections.push(`ACTIVE PROJECT TASK: ${context.activeTask}`);
    }

    if (context.technologies && context.technologies.length > 0) {
      sections.push(`ACTIVE TECH STACK: ${context.technologies.join(", ")}`);
    }

    if (context.architecture) {
      sections.push(`PROJECT ARCHITECTURE: ${context.architecture}`);
    }

    if (context.solvedIssues && context.solvedIssues.length > 0) {
      const issues = context.solvedIssues.map((s) => `- ${s.issue}: ${s.solution}`).join("\n");
      sections.push(`RECENTLY SOLVED ISSUES (DO NOT RE-DEBUG):\n${issues}`);
    }

    return sections.length > 0 ? `\nPROJECT & TECHNICAL CONTEXT:\n${sections.join("\n")}\n` : "";
  }
}
