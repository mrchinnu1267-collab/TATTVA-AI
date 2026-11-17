/**
 * TATTVA AI - AST & Symbol Extractor
 * Parses TypeScript, JavaScript, Python, Dart, Kotlin, and SQL to extract
 * symbols, exported entities, API route definitions, and database schemas.
 */

import type { CodeSymbol, SupportedLanguage, ApiRouteInfo, DatabaseSchemaInfo } from "./types";

/**
 * Extracts symbols and declarations from code text based on detected language.
 */
export function extractSymbols(
  content: string,
  language: SupportedLanguage,
  filePath: string
): {
  symbols: CodeSymbol[];
  imports: string[];
  exports: string[];
} {
  const symbols: CodeSymbol[] = [];
  const imports: string[] = [];
  const exports: string[] = [];

  const lines = content.split("\n");

  if (language === "typescript" || language === "javascript") {
    // 1. Imports
    const importRegex = /(?:import\s+(?:[\w*\s{},]*)\s+from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
    let match: RegExpExecArray | null;
    while ((match = importRegex.exec(content)) !== null) {
      const imp = match[1] || match[2];
      if (imp && !imports.includes(imp)) imports.push(imp);
    }

    // 2. Line by line symbol extraction
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const isExported = /^\s*export\s+/.test(line);

      // Functions: function foo( or export function foo( or const foo = (...) =>
      const fnMatch = /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/i.exec(line);
      if (fnMatch) {
        const name = fnMatch[1];
        const isComp = /^[A-Z]/.test(name) && (content.includes("return <") || content.includes("return ("));
        symbols.push({
          name,
          kind: isComp ? "component" : "function",
          filePath,
          line: lineNum,
          isExported,
          signature: line.trim().slice(0, 80),
        });
        if (isExported && !exports.includes(name)) exports.push(name);
        continue;
      }

      // Arrow functions & functional components: const foo = (...) => or const Foo: React.FC = (...) =>
      const arrowMatch = /^\s*(?:export\s+)?const\s+([A-Za-z0-9_$]+)(?:\s*:\s*[^=]+)?\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>/i.exec(line);
      if (arrowMatch) {
        const name = arrowMatch[1];
        const isComp = /^[A-Z]/.test(name);
        symbols.push({
          name,
          kind: isComp ? "component" : "function",
          filePath,
          line: lineNum,
          isExported,
          signature: line.trim().slice(0, 80),
        });
        if (isExported && !exports.includes(name)) exports.push(name);
        continue;
      }

      // Classes: class Foo or export class Foo
      const classMatch = /^\s*(?:export\s+)?class\s+([A-Za-z0-9_$]+)/i.exec(line);
      if (classMatch) {
        const name = classMatch[1];
        symbols.push({
          name,
          kind: "class",
          filePath,
          line: lineNum,
          isExported,
          signature: line.trim().slice(0, 80),
        });
        if (isExported && !exports.includes(name)) exports.push(name);
        continue;
      }

      // Interfaces: interface Foo
      const ifaceMatch = /^\s*(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/i.exec(line);
      if (ifaceMatch) {
        const name = ifaceMatch[1];
        symbols.push({
          name,
          kind: "interface",
          filePath,
          line: lineNum,
          isExported,
          signature: line.trim().slice(0, 80),
        });
        if (isExported && !exports.includes(name)) exports.push(name);
        continue;
      }

      // Types: type Foo =
      const typeMatch = /^\s*(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=/i.exec(line);
      if (typeMatch) {
        const name = typeMatch[1];
        symbols.push({
          name,
          kind: "type",
          filePath,
          line: lineNum,
          isExported,
          signature: line.trim().slice(0, 80),
        });
        if (isExported && !exports.includes(name)) exports.push(name);
        continue;
      }
    }
  } else if (language === "python") {
    // Python imports
    const pyImportRegex = /(?:from\s+([a-zA-Z0-9_.]+)\s+import|import\s+([a-zA-Z0-9_.]+))/g;
    let match: RegExpExecArray | null;
    while ((match = pyImportRegex.exec(content)) !== null) {
      const imp = match[1] || match[2];
      if (imp && !imports.includes(imp)) imports.push(imp);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fnMatch = /^\s*def\s+([a-zA-Z0-9_]+)\s*\(/i.exec(line);
      if (fnMatch) {
        symbols.push({
          name: fnMatch[1],
          kind: "function",
          filePath,
          line: i + 1,
          isExported: !fnMatch[1].startsWith("_"),
          signature: line.trim(),
        });
      }
      const clsMatch = /^\s*class\s+([a-zA-Z0-9_]+)/i.exec(line);
      if (clsMatch) {
        symbols.push({
          name: clsMatch[1],
          kind: "class",
          filePath,
          line: i + 1,
          isExported: true,
          signature: line.trim(),
        });
      }
    }
  } else if (language === "go") {
    // Go imports and declarations
    const goImportRegex = /import\s+(?:\(\s*([\s\S]*?)\s*\)|"([^"]+)")/g;
    let match: RegExpExecArray | null;
    while ((match = goImportRegex.exec(content)) !== null) {
      if (match[2]) imports.push(match[2]);
      else if (match[1]) {
        match[1].split("\n").forEach((l) => {
          const m = l.match(/"([^"]+)"/);
          if (m && !imports.includes(m[1])) imports.push(m[1]);
        });
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fnMatch = /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z0-9_]+)\s*\(/i.exec(line);
      if (fnMatch) {
        const name = fnMatch[1];
        const isExported = /^[A-Z]/.test(name);
        symbols.push({
          name,
          kind: "function",
          filePath,
          line: i + 1,
          isExported,
          signature: line.trim().slice(0, 80),
        });
        if (isExported) exports.push(name);
      }
      const typeMatch = /^\s*type\s+([A-Za-z0-9_]+)\s+(?:struct|interface)/i.exec(line);
      if (typeMatch) {
        const name = typeMatch[1];
        const isExported = /^[A-Z]/.test(name);
        symbols.push({
          name,
          kind: line.includes("interface") ? "interface" : "class",
          filePath,
          line: i + 1,
          isExported,
          signature: line.trim().slice(0, 80),
        });
        if (isExported) exports.push(name);
      }
    }
  } else if (language === "rust") {
    // Rust use statements and fn / struct / enum
    const rustUseRegex = /use\s+([^;]+);/g;
    let match: RegExpExecArray | null;
    while ((match = rustUseRegex.exec(content)) !== null) {
      const imp = match[1].trim();
      if (!imports.includes(imp)) imports.push(imp);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isPub = /^\s*pub\s+/.test(line);
      const fnMatch = /^\s*(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)/i.exec(line);
      if (fnMatch) {
        symbols.push({
          name: fnMatch[1],
          kind: "function",
          filePath,
          line: i + 1,
          isExported: isPub,
          signature: line.trim().slice(0, 80),
        });
        if (isPub) exports.push(fnMatch[1]);
      }
      const structMatch = /^\s*(?:pub\s+)?(?:struct|enum|trait)\s+([A-Za-z0-9_]+)/i.exec(line);
      if (structMatch) {
        symbols.push({
          name: structMatch[1],
          kind: line.includes("trait") ? "interface" : "class",
          filePath,
          line: i + 1,
          isExported: isPub,
          signature: line.trim().slice(0, 80),
        });
        if (isPub) exports.push(structMatch[1]);
      }
    }
  } else if (language === "java") {
    // Java package/import and class/method extraction
    const javaImportRegex = /import\s+([^;]+);/g;
    let match: RegExpExecArray | null;
    while ((match = javaImportRegex.exec(content)) !== null) {
      const imp = match[1].trim();
      if (!imports.includes(imp)) imports.push(imp);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isPub = /public\s+/.test(line);
      const clsMatch = /^\s*(?:public\s+)?(?:abstract\s+)?(?:class|interface|enum)\s+([A-Za-z0-9_]+)/i.exec(line);
      if (clsMatch) {
        symbols.push({
          name: clsMatch[1],
          kind: line.includes("interface") ? "interface" : "class",
          filePath,
          line: i + 1,
          isExported: isPub,
          signature: line.trim().slice(0, 80),
        });
        if (isPub) exports.push(clsMatch[1]);
      }
    }
  } else if (language === "c" || language === "cpp") {
    // C/C++ #include and function definitions
    const cIncludeRegex = /#include\s+[<"]([^>"]+)[>"]/g;
    let match: RegExpExecArray | null;
    while ((match = cIncludeRegex.exec(content)) !== null) {
      const imp = match[1].trim();
      if (!imports.includes(imp)) imports.push(imp);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fnMatch = /^\s*(?:[A-Za-z0-9_*<>&]+\s+)+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/i.exec(line);
      if (fnMatch && !/^(if|while|for|switch|catch)/.test(fnMatch[1])) {
        symbols.push({
          name: fnMatch[1],
          kind: "function",
          filePath,
          line: i + 1,
          isExported: true,
          signature: line.trim().slice(0, 80),
        });
      }
    }
  }

  return { symbols, imports, exports };
}

/**
 * Extracts Next.js API Route information if the file matches route.ts / route.js.
 */
export function extractApiRoute(filePath: string, content: string): ApiRouteInfo | null {
  const normalized = filePath.replace(/\\/g, "/");
  if (!normalized.includes("/api/") || !/\/route\.(ts|js)$/.test(normalized)) {
    return null;
  }

  // Derive route path from directory structure: e.g. /app/api/image/jobs/route.ts -> /api/image/jobs
  const apiIndex = normalized.indexOf("/api/");
  const routeEnd = normalized.lastIndexOf("/route.");
  const routePath = normalized.slice(apiIndex, routeEnd);

  const methods: Array<"GET" | "POST" | "PUT" | "DELETE" | "PATCH"> = [];
  if (/(?:export\s+(?:async\s+)?function\s+GET)/i.test(content)) methods.push("GET");
  if (/(?:export\s+(?:async\s+)?function\s+POST)/i.test(content)) methods.push("POST");
  if (/(?:export\s+(?:async\s+)?function\s+PUT)/i.test(content)) methods.push("PUT");
  if (/(?:export\s+(?:async\s+)?function\s+DELETE)/i.test(content)) methods.push("DELETE");
  if (/(?:export\s+(?:async\s+)?function\s+PATCH)/i.test(content)) methods.push("PATCH");

  return {
    routePath,
    filePath,
    methods,
    isDynamic: routePath.includes("[") && routePath.includes("]"),
  };
}

/**
 * Extracts PostgreSQL / SQLite schema definitions from .sql files.
 */
export function extractDatabaseSchemas(filePath: string, content: string): DatabaseSchemaInfo[] {
  const schemas: DatabaseSchemaInfo[] = [];
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const body = match[2] || "";

    const columns: DatabaseSchemaInfo["columns"] = [];
    const foreignKeys: DatabaseSchemaInfo["foreignKeys"] = [];

    const lines = body.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("--"));

    for (const line of lines) {
      if (/^FOREIGN\s+KEY|^\s*CONSTRAINT/i.test(line)) {
        const fkMatch = /FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s*(?:public\.)?([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i.exec(line);
        if (fkMatch) {
          foreignKeys.push({
            column: fkMatch[1].trim(),
            targetTable: fkMatch[2].trim(),
            targetColumn: fkMatch[3].trim(),
          });
        }
        continue;
      }

      const colMatch = /^([a-zA-Z0-9_]+)\s+([A-Za-z0-9_()]+)/i.exec(line);
      if (colMatch && !/^(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|CHECK)/i.test(colMatch[1])) {
        const name = colMatch[1];
        const type = colMatch[2];
        const isPrimary = /PRIMARY\s+KEY/i.test(line);
        const isNullable = !/NOT\s+NULL/i.test(line);

        columns.push({ name, type, isPrimary, isNullable });
      }
    }

    schemas.push({ tableName, filePath, columns, foreignKeys });
  }

  return schemas;
}
