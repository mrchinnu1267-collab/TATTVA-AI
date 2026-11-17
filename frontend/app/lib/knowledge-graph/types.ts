/**
 * TATTVA AI - Advanced Knowledge Graph Engine Types
 * Multi-tenant knowledge organization, entity extraction, relationship traversal,
 * and contradiction detection.
 * Conceptualized & Engineered by Kotapati Gowtham Chowdary
 */

export type EntityType =
  | "concept"
  | "language"
  | "framework"
  | "library"
  | "api"
  | "tool"
  | "organization"
  | "person"
  | "architecture"
  | "protocol"
  | "database"
  | "metric"
  | "security_vulnerability";

export type RelationType =
  | "implements"
  | "depends_on"
  | "extends"
  | "alternative_to"
  | "compatible_with"
  | "part_of"
  | "uses"
  | "contradicts"
  | "supersedes"
  | "authored_by"
  | "defined_in"
  | "relates_to";

export interface KnowledgeNode {
  id: string;
  name: string;
  type: EntityType;
  description: string;
  aliases: string[];
  sourceDocumentIds: string[];
  confidence: number;
  tenantId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  properties: Record<string, string | number | boolean>;
}

export interface KnowledgeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: RelationType;
  confidence: number;
  evidenceSnippet: string;
  sourceDocumentId?: string;
  tenantId: string;
  workspaceId: string;
  createdAt: string;
  weight: number;
}

export interface Contradiction {
  id: string;
  entityAId: string;
  entityBId: string;
  entityAName: string;
  entityBName: string;
  claimA: string;
  claimB: string;
  docAId?: string;
  docBId?: string;
  detectedAt: string;
  severity: "low" | "medium" | "high";
  resolutionSuggestion: string;
}

export interface Subgraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  centerNodeId?: string;
  depth: number;
}

export interface TraversalPath {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  hopCount: number;
  explanation: string;
}

export interface GraphQACitation {
  documentId?: string;
  snippet: string;
  confidence: number;
}

export interface GraphQAResult {
  question: string;
  answer: string;
  targetEntities: KnowledgeNode[];
  relationships: KnowledgeEdge[];
  traversalPath?: TraversalPath;
  citations: GraphQACitation[];
  contradictionsFound: Contradiction[];
  confidence: number;
}

export interface GraphIngestionResult {
  nodesCreated: number;
  nodesUpdated: number;
  edgesCreated: number;
  contradictionsDetected: number;
  documentId?: string;
  timestamp: string;
}
