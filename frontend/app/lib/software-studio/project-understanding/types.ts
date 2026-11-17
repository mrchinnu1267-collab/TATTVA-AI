/**
 * TATTVA AI - Project Understanding Engine Types
 * Definitions for codebase indexing, AST symbol extraction, and dependency graphs.
 */

export type SupportedLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "go"
  | "rust"
  | "java"
  | "c"
  | "cpp"
  | "php"
  | "dart"
  | "kotlin"
  | "sql"
  | "html"
  | "css"
  | "json"
  | "markdown"
  | "unknown";

export type SymbolKind = "function" | "class" | "interface" | "type" | "api_route" | "component" | "database_table";

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  filePath: string;
  line: number;
  isExported: boolean;
  signature?: string;
  documentation?: string;
}

export interface FileIndexEntry {
  filePath: string;
  relativePath: string;
  language: SupportedLanguage;
  sizeBytes: number;
  lastModifiedMs: number;
  hash: string;
  imports: string[];
  exports: string[];
  symbols: CodeSymbol[];
  lineCount: number;
}

export interface ApiRouteInfo {
  routePath: string; // e.g. /api/image/jobs
  filePath: string;
  methods: Array<"GET" | "POST" | "PUT" | "DELETE" | "PATCH">;
  isDynamic: boolean;
}

export interface DatabaseSchemaInfo {
  tableName: string;
  filePath: string;
  columns: Array<{ name: string; type: string; isPrimary?: boolean; isNullable?: boolean }>;
  foreignKeys: Array<{ column: string; targetTable: string; targetColumn: string }>;
}

export interface ProjectGraph {
  rootPath: string;
  scannedAt: string;
  totalFiles: number;
  totalLines: number;
  languages: Record<SupportedLanguage, number>; // counts of files
  dependencies: Record<string, string>; // package name -> version
  devDependencies: Record<string, string>;
  framework: "nextjs" | "react" | "fastapi" | "flutter" | "node" | "unknown";
  apiRoutes: ApiRouteInfo[];
  databaseSchemas: DatabaseSchemaInfo[];
  files: Record<string, FileIndexEntry>; // relativePath -> FileIndexEntry
}
