/**
 * TATTVA AI - Multi-Document Comparative Analysis Engine
 * Compares 2 or more documents, identifies shared concepts, contrasts differences,
 * and compiles a structured comparison matrix.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

export interface MultiDocumentComparisonResult {
  documents: string[];
  totalWordCount: number;
  sharedThemes: string[];
  divergentPoints: Array<{
    theme: string;
    details: Record<string, string>;
  }>;
  comparisonMatrix: Array<{
    featureOrDimension: string;
    documentValues: Record<string, string>;
  }>;
  markdownSummary: string;
}

/**
 * Conducts deep comparative analysis between two or more documents
 */
export function compareMultipleDocuments(
  docs: Array<{ name: string; content: string }>
): MultiDocumentComparisonResult {
  if (!docs || docs.length < 2) {
    throw new Error("At least two documents are required for comparative analysis.");
  }

  const docNames = docs.map((d) => d.name);
  let totalWordCount = 0;

  // Extract word sets for each doc
  const docWordSets: Map<string, Set<string>> = new Map();
  const docTokens: Map<string, string[]> = new Map();

  for (const doc of docs) {
    const tokens = doc.content
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);
    totalWordCount += tokens.length;
    docWordSets.set(doc.name, new Set(tokens));
    docTokens.set(doc.name, tokens);
  }

  // Compute shared vocabulary themes
  const firstSet = docWordSets.get(docs[0].name)!;
  const commonWords = new Set<string>();

  for (const word of firstSet) {
    let inAll = true;
    for (let i = 1; i < docs.length; i++) {
      if (!docWordSets.get(docs[i].name)!.has(word)) {
        inAll = false;
        break;
      }
    }
    if (inAll) {
      commonWords.add(word);
    }
  }

  // Filter stop words from themes
  const stopWords = new Set(["this", "that", "with", "from", "have", "more", "also", "into", "their", "will", "each", "were", "when", "which", "some", "other"]);
  const sharedThemes = Array.from(commonWords)
    .filter((w) => !stopWords.has(w))
    .slice(0, 8);

  // Divergent points (words prominent in doc A but absent in doc B)
  const divergentPoints: Array<{ theme: string; details: Record<string, string> }> = [];
  for (let i = 0; i < docs.length; i++) {
    const currentName = docs[i].name;
    const currentSet = docWordSets.get(currentName)!;

    for (let j = i + 1; j < docs.length; j++) {
      const otherName = docs[j].name;
      const otherSet = docWordSets.get(otherName)!;

      const uniqueToCurrent = Array.from(currentSet).filter((w) => !otherSet.has(w) && !stopWords.has(w)).slice(0, 3);
      const uniqueToOther = Array.from(otherSet).filter((w) => !currentSet.has(w) && !stopWords.has(w)).slice(0, 3);

      if (uniqueToCurrent.length > 0 || uniqueToOther.length > 0) {
        divergentPoints.push({
          theme: `Focal Distinctions (${currentName} vs ${otherName})`,
          details: {
            [currentName]: `Focuses uniquely on: ${uniqueToCurrent.join(", ") || "N/A"}`,
            [otherName]: `Focuses uniquely on: ${uniqueToOther.join(", ") || "N/A"}`,
          },
        });
      }
    }
  }

  // Comparison Matrix Dimensions
  const comparisonMatrix: Array<{ featureOrDimension: string; documentValues: Record<string, string> }> = [
    {
      featureOrDimension: "Document Size (Words)",
      documentValues: docs.reduce((acc, d) => {
        acc[d.name] = `${docTokens.get(d.name)!.length} words`;
        return acc;
      }, {} as Record<string, string>),
    },
    {
      featureOrDimension: "Primary Subject Scope",
      documentValues: docs.reduce((acc, d) => {
        const topWords = Array.from(docWordSets.get(d.name)!).slice(0, 4).join(", ");
        acc[d.name] = `Scope: ${topWords}`;
        return acc;
      }, {} as Record<string, string>),
    },
    {
      featureOrDimension: "Structural Format",
      documentValues: docs.reduce((acc, d) => {
        const ext = d.name.split(".").pop() || "txt";
        acc[d.name] = d.content.includes("|") ? `Tabular / ${ext}` : `Textual / ${ext}`;
        return acc;
      }, {} as Record<string, string>),
    },
  ];

  // Markdown Summary
  let md = `## Multi-Document Comparative Analysis\n\n`;
  md += `**Documents Evaluated:** ${docNames.map((d) => `\`${d}\``).join(", ")}\n`;
  md += `**Total Word Volume:** ${totalWordCount} words\n\n`;

  md += `### Common Conceptual Themes\n`;
  if (sharedThemes.length > 0) {
    md += sharedThemes.map((t) => `- **${t.toUpperCase()}**: Addressed mutually across all evaluated documents.`).join("\n") + "\n\n";
  } else {
    md += `- No direct high-frequency lexical convergence detected.\n\n`;
  }

  md += `### Key Comparative Matrix\n`;
  md += `| Dimension | ${docNames.map((d) => `\`${d}\``).join(" | ")} |\n`;
  md += `| :--- | ${docNames.map(() => ":---").join(" | ")} |\n`;
  for (const row of comparisonMatrix) {
    const vals = docNames.map((name) => row.documentValues[name] || "N/A").join(" | ");
    md += `| **${row.featureOrDimension}** | ${vals} |\n`;
  }
  md += `\n`;

  if (divergentPoints.length > 0) {
    md += `### Contrasting Aspects & Domain Focus\n`;
    for (const dp of divergentPoints) {
      md += `#### ${dp.theme}\n`;
      for (const [docName, detail] of Object.entries(dp.details)) {
        md += `- **${docName}**: ${detail}\n`;
      }
      md += `\n`;
    }
  }

  return {
    documents: docNames,
    totalWordCount,
    sharedThemes,
    divergentPoints,
    comparisonMatrix,
    markdownSummary: md,
  };
}
