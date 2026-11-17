/**
 * TATTVA AI - Named Entity & Technical Concept Extractor
 * Extracts domain concepts, technologies, parameters, and entities from user prompts
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

const KNOWN_TECH_ENTITIES = [
  "next.js", "react", "vue", "angular", "svelte", "typescript", "javascript", "python",
  "java", "c++", "c#", "rust", "go", "golang", "php", "ruby", "swift", "kotlin", "flutter", "dart",
  "c", "sql", "supabase", "firebase", "postgresql", "mysql", "mongodb", "redis", "sqlite",
  "docker", "kubernetes", "aws", "gcp", "azure", "vercel", "cloudflare",
  "tailwind", "css", "html", "graphql", "rest api", "prisma", "drizzle",
  "fastapi", "flask", "django", "spring boot", "node.js", "express",
  "chart.js", "d3.js", "framer motion", "lucene", "pgvector", "oauth",
  "jwt", "bcrypt", "gemini", "claude", "openai", "pytorch", "tensorflow"
];

const DOMAIN_KEYWORD_PATTERNS: Array<{ category: string; regex: RegExp }> = [
  { category: "education", regex: /\b(student|teacher|course|attendance|marks|grade|exam|college|university|syllabus|assignment)\b/gi },
  { category: "ecommerce", regex: /\b(product|cart|checkout|order|payment|inventory|stripe|catalog|customer)\b/gi },
  { category: "finance", regex: /\b(budget|invoice|revenue|expense|tax|currency|stock|crypto|balance|financial)\b/gi },
  { category: "healthcare", regex: /\b(patient|doctor|appointment|prescription|medicine|clinic|hospital|vitals)\b/gi },
  { category: "iot_energy", regex: /\b(sensor|telemetry|iot|solar|grid|kw|kwh|aqi|temperature|mqtt|co2)\b/gi },
  { category: "social_media", regex: /\b(post|comment|like|feed|follower|share|profile|notification|chat)\b/gi },
];

export class EntityExtractor {
  private static instance: EntityExtractor;

  public static getInstance(): EntityExtractor {
    if (!EntityExtractor.instance) {
      EntityExtractor.instance = new EntityExtractor();
    }
    return EntityExtractor.instance;
  }

  public extractEntities(prompt: string): {
    entities: string[];
    technologies: string[];
    domains: string[];
  } {
    const lower = prompt.toLowerCase();
    const foundEntities = new Set<string>();
    const foundTech = new Set<string>();
    const foundDomains = new Set<string>();

    // 1. Tech stack detection
    for (const tech of KNOWN_TECH_ENTITIES) {
      const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const hasTrailingSymbol = /[^a-zA-Z0-9]/.test(tech.slice(-1));
      const pattern = hasTrailingSymbol
        ? `(?:\\b|(?<=[^a-zA-Z0-9]))${escaped}(?=[^a-zA-Z0-9]|$)`
        : `\\b${escaped}\\b`;
      const regex = new RegExp(pattern, "i");
      if (regex.test(lower)) {
        foundTech.add(tech);
        foundEntities.add(tech);
      }
    }

    // 2. Domain concepts detection
    for (const item of DOMAIN_KEYWORD_PATTERNS) {
      const matches = lower.match(item.regex);
      if (matches) {
        foundDomains.add(item.category);
        for (const m of matches) {
          foundEntities.add(m.toLowerCase());
        }
      }
    }

    // 3. Quoted entities (e.g. "student_records", "Navbar")
    const quotedMatches = prompt.match(/["']([^"']{2,40})["']/g);
    if (quotedMatches) {
      for (const q of quotedMatches) {
        const clean = q.replace(/["']/g, "").trim();
        if (clean.length > 2) foundEntities.add(clean);
      }
    }

    return {
      entities: Array.from(foundEntities),
      technologies: Array.from(foundTech),
      domains: Array.from(foundDomains),
    };
  }
}

export const entityExtractor = EntityExtractor.getInstance();
