/**
 * TATTVA AI - Knowledge Graph Entity & Relation Extractor
 * Extracts typed domain entities, properties, and directed semantic relationships
 * from unstructured text, code documents, and architecture specifications.
 * Conceptualized & Engineered by Kotapati Gowtham Chowdary
 */

import { EntityType, RelationType } from "./types";

export interface RawExtractedEntity {
  name: string;
  type: EntityType;
  description: string;
  aliases: string[];
  confidence: number;
  properties: Record<string, string | number | boolean>;
  evidenceSnippet: string;
}

export interface RawExtractedRelation {
  sourceName: string;
  targetName: string;
  relation: RelationType;
  confidence: number;
  evidenceSnippet: string;
}

export interface ExtractionOutput {
  entities: RawExtractedEntity[];
  relations: RawExtractedRelation[];
}

// Curated high-confidence technical vocabulary and ontology
const KNOWN_ONTOLOGY: Record<string, { type: EntityType; aliases?: string[]; description: string }> = {
  // Languages
  typescript: { type: "language", aliases: ["ts"], description: "Statically typed superset of JavaScript developed by Microsoft." },
  javascript: { type: "language", aliases: ["js", "ecmascript"], description: "High-level, interpreted scripting language of the Web." },
  python: { type: "language", aliases: ["py"], description: "Interpreted, high-level, general-purpose programming language." },
  rust: { type: "language", aliases: ["rs"], description: "Multi-paradigm language focused on performance and memory safety." },
  golang: { type: "language", aliases: ["go"], description: "Statically typed, compiled language developed by Google." },
  java: { type: "language", description: "Class-based, object-oriented language designed for cross-platform bytecode execution." },
  cplusplus: { type: "language", aliases: ["c++", "cpp"], description: "General-purpose programming language created as an extension of C." },
  sql: { type: "language", description: "Domain-specific language used in programming and designed for managing data in RDBMS." },

  // Frameworks & Libraries
  react: { type: "framework", aliases: ["react.js", "reactjs"], description: "Declarative component-based UI library developed by Meta." },
  nextjs: { type: "framework", aliases: ["next.js", "next"], description: "The React framework for the Web with Server Components and SSR." },
  vue: { type: "framework", aliases: ["vue.js", "vuejs"], description: "Progressive JavaScript framework for building user interfaces." },
  angular: { type: "framework", description: "TypeScript-based open-source web application framework led by Google." },
  fastapi: { type: "framework", description: "Modern, high-performance web framework for building APIs with Python." },
  django: { type: "framework", description: "High-level Python web framework that encourages rapid development." },
  spring: { type: "framework", aliases: ["spring boot"], description: "Comprehensive application framework for the Java platform." },
  express: { type: "framework", aliases: ["express.js"], description: "Fast, unopinionated, minimalist web framework for Node.js." },
  tailwind: { type: "library", aliases: ["tailwindcss"], description: "Utility-first CSS framework for rapid UI development." },
  pydantic: { type: "library", description: "Data validation and settings management using Python type hints." },
  prisma: { type: "library", aliases: ["prisma orm"], description: "Next-generation ORM for Node.js and TypeScript." },

  // Databases & Storage
  postgresql: { type: "database", aliases: ["postgres", "pgsql"], description: "Powerful, open source object-relational database system." },
  supabase: { type: "database", description: "Open source Firebase alternative providing PostgreSQL with Row-Level Security." },
  redis: { type: "database", description: "In-memory data structure store used as a database, cache, and message broker." },
  mongodb: { type: "database", description: "Document-oriented NoSQL database used for high volume data storage." },
  firebase: { type: "database", aliases: ["firestore"], description: "Backend-as-a-Service platform offering real-time databases and hosting." },

  // Architecture & Concepts
  microservices: { type: "architecture", description: "Architectural style structuring an application as a collection of services." },
  serverless: { type: "architecture", description: "Cloud computing execution model where the cloud provider manages server allocation." },
  monolith: { type: "architecture", description: "Software design where different components are combined into a single program." },
  pubsub: { type: "architecture", aliases: ["publish-subscribe"], description: "Messaging pattern where senders categorize messages without specific receivers." },
  rest: { type: "architecture", aliases: ["restful", "rest api"], description: "Representational State Transfer architectural style for distributed hypermedia." },
  graphql: { type: "architecture", description: "Query language for APIs and runtime for fulfilling queries with existing data." },

  // Protocols & Tools
  http: { type: "protocol", aliases: ["https", "http/2", "http/3"], description: "Hypertext Transfer Protocol foundational to data communication on the Web." },
  grpc: { type: "protocol", description: "High-performance, open source universal RPC framework developed by Google." },
  websocket: { type: "protocol", aliases: ["ws", "wss"], description: "Computer communications protocol providing full-duplex communication channels." },
  docker: { type: "tool", description: "Platform designed to build, share, and run modern applications using containers." },
  kubernetes: { type: "tool", aliases: ["k8s"], description: "Open-source system for automating deployment, scaling, and management of containerized apps." },
  vercel: { type: "tool", aliases: ["vercel platform"], description: "Cloud platform for static sites and Serverless Functions." },
};

export class EntityExtractor {
  /**
   * Main entity & relation extraction method
   */
  public static extractFromText(text: string): ExtractionOutput {
    const entitiesMap = new Map<string, RawExtractedEntity>();
    const relations: RawExtractedRelation[] = [];

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return { entities: [], relations: [] };
    }

    const sentences = text
      .split(/(?<=[.!?\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    // 1. Extract known ontology entities
    for (const [key, meta] of Object.entries(KNOWN_ONTOLOGY)) {
      const matchers = [key, ...(meta.aliases || [])];
      for (const matcher of matchers) {
        const regex = new RegExp(`\\b${escapeRegex(matcher)}\\b`, "i");
        for (const sentence of sentences) {
          if (regex.test(sentence)) {
            const canonicalName = capitalize(key);
            if (!entitiesMap.has(canonicalName)) {
              entitiesMap.set(canonicalName, {
                name: canonicalName,
                type: meta.type,
                description: meta.description,
                aliases: meta.aliases || [],
                confidence: 0.95,
                properties: extractProperties(canonicalName, sentence),
                evidenceSnippet: sentence.slice(0, 200),
              });
            }
            break;
          }
        }
      }
    }

    // 2. Discover dynamically named concepts (e.g. PascalCase or CamelCase symbols, technical terms)
    const dynamicPattern = /\b([A-Z][a-zA-Z0-9]{2,}(?:\s+[A-Z][a-zA-Z0-9]{2,})*)\b/g;
    for (const sentence of sentences) {
      let match: RegExpExecArray | null;
      while ((match = dynamicPattern.exec(sentence)) !== null) {
        const term = match[1].trim();
        // Ignore generic common words
        if (isCommonStopword(term) || term.length <= 2) continue;

        const canonical = term;
        if (!entitiesMap.has(canonical)) {
          entitiesMap.set(canonical, {
            name: canonical,
            type: inferEntityType(canonical, sentence),
            description: `Concept extracted from domain documentation: ${term}.`,
            aliases: [],
            confidence: 0.8,
            properties: extractProperties(canonical, sentence),
            evidenceSnippet: sentence.slice(0, 200),
          });
        }
      }
    }

    // 3. Extract semantic relationships across sentences
    const entities = Array.from(entitiesMap.values());
    for (const sentence of sentences) {
      const matchedEntitiesInSentence = entities.filter((e) => {
        const testNames = [e.name, ...e.aliases];
        return testNames.some((n) => new RegExp(`\\b${escapeRegex(n)}\\b`, "i").test(sentence));
      });

      if (matchedEntitiesInSentence.length >= 2) {
        for (let i = 0; i < matchedEntitiesInSentence.length; i++) {
          for (let j = 0; j < matchedEntitiesInSentence.length; j++) {
            if (i === j) continue;
            const src = matchedEntitiesInSentence[i];
            const tgt = matchedEntitiesInSentence[j];

            const rel = detectRelationBetween(src.name, tgt.name, sentence);
            if (rel) {
              // Avoid duplicate directed edges in this sentence
              const exists = relations.some(
                (r) => r.sourceName === src.name && r.targetName === tgt.name && r.relation === rel.relation
              );
              if (!exists) {
                relations.push({
                  sourceName: src.name,
                  targetName: tgt.name,
                  relation: rel.relation,
                  confidence: rel.confidence,
                  evidenceSnippet: sentence.slice(0, 250),
                });
              }
            }
          }
        }
      }
    }

    return {
      entities: Array.from(entitiesMap.values()),
      relations,
    };
  }
}

// Helpers
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalize(str: string): string {
  if (str.toLowerCase() === "nextjs" || str.toLowerCase() === "next.js") return "Next.js";
  if (str.toLowerCase() === "typescript") return "TypeScript";
  if (str.toLowerCase() === "javascript") return "JavaScript";
  if (str.toLowerCase() === "postgresql") return "PostgreSQL";
  if (str.toLowerCase() === "fastapi") return "FastAPI";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function isCommonStopword(term: string): boolean {
  const stopwords = new Set([
    "The", "This", "That", "These", "Those", "There", "Here", "When", "Where",
    "Which", "What", "Who", "Why", "How", "All", "Any", "Both", "Each", "Few",
    "More", "Most", "Other", "Some", "Such", "No", "Nor", "Not", "Only", "Own",
    "Same", "So", "Than", "Too", "Very", "Can", "Will", "Just", "Don", "Should",
    "Now", "An", "A", "And", "Or", "If", "Because", "As", "Until", "While",
    "About", "Against", "Between", "Into", "Through", "During", "Before", "After",
    "Above", "Below", "To", "From", "Up", "Down", "In", "Out", "On", "Off",
    "Over", "Under", "Again", "Further", "Then", "Once", "Every", "User", "System"
  ]);
  return stopwords.has(term);
}

function inferEntityType(term: string, context: string): EntityType {
  const lower = context.toLowerCase();
  if (lower.includes("framework") || lower.includes("library")) return "framework";
  if (lower.includes("database") || lower.includes("sql") || lower.includes("store")) return "database";
  if (lower.includes("protocol") || lower.includes("network")) return "protocol";
  if (lower.includes("vulnerability") || lower.includes("cve") || lower.includes("exploit")) return "security_vulnerability";
  if (lower.includes("architecture") || lower.includes("pattern")) return "architecture";
  if (lower.includes("language")) return "language";
  if (lower.includes("tool") || lower.includes("cli")) return "tool";
  return "concept";
}

function extractProperties(term: string, context: string): Record<string, string | number | boolean> {
  const props: Record<string, string | number | boolean> = {};
  const versionMatch = context.match(/(?:version|v|release)\s*([0-9]+(?:\.[0-9]+)*)/i);
  if (versionMatch) {
    props.version = versionMatch[1];
  }
  if (/open[\s-]source/i.test(context)) {
    props.openSource = true;
  }
  return props;
}

function detectRelationBetween(
  srcName: string,
  tgtName: string,
  sentence: string
): { relation: RelationType; confidence: number } | null {
  const s = sentence.toLowerCase();
  const src = srcName.toLowerCase();
  const tgt = tgtName.toLowerCase();

  const srcIndex = s.indexOf(src);
  const tgtIndex = s.indexOf(tgt);

  if (srcIndex === -1 || tgtIndex === -1) return null;

  // Patterns where source precedes target
  if (srcIndex < tgtIndex) {
    const between = s.slice(srcIndex + src.length, tgtIndex);
    // Prioritize the clause immediately adjacent/preceding the target entity
    const targetClause = between.split(/\b(?:and|while|but|whereas|,)\b/).pop() || between;
    const inspectString = (testRegex: RegExp) => testRegex.test(targetClause) || testRegex.test(between);

    if (inspectString(/\b(?:alternative\s+to|replaces|substitutes|competes\s+with|vs\.?)\b/)) {
      return { relation: "alternative_to", confidence: 0.88 };
    }
    if (inspectString(/\b(?:contradicts|conflicts\s+with|incompatible\s+with|mutually\s+exclusive)\b/)) {
      return { relation: "contradicts", confidence: 0.9 };
    }
    if (inspectString(/\b(?:supersedes|deprecated\s+in\s+favor\s+of|succeeded\s+by)\b/)) {
      return { relation: "supersedes", confidence: 0.9 };
    }
    if (inspectString(/\b(?:extends|built\s+on\s+top\s+of|based\s+on|inherits\s+from)\b/)) {
      return { relation: "extends", confidence: 0.92 };
    }
    if (inspectString(/\b(?:implements|complies\s+with|adheres\s+to)\b/)) {
      return { relation: "implements", confidence: 0.9 };
    }
    if (inspectString(/\b(?:part\s+of|component\s+of|subsystem\s+of)\b/)) {
      return { relation: "part_of", confidence: 0.86 };
    }
    if (inspectString(/\b(?:compatible\s+with|supports|works\s+with)\b/)) {
      return { relation: "compatible_with", confidence: 0.85 };
    }
    if (inspectString(/\b(?:depends\s+on|requires|relies\s+on|needs)\b/)) {
      return { relation: "depends_on", confidence: 0.9 };
    }
    if (inspectString(/\b(?:uses|leverages|utilizes|incorporates|integrates\s+with)\b/)) {
      return { relation: "uses", confidence: 0.88 };
    }
  }

  // Fallback co-occurrence relation
  return { relation: "relates_to", confidence: 0.65 };
}
