/**
 * TATTVA AI - Flashcard Exporter
 * Generates Anki-compatible TSV and JSON exports for offline spaced repetition
 */

import { SpacedRepetitionCard, FlashcardExportBundle } from "./types";

export class FlashcardExporter {
  /**
   * Generates an Anki-compatible tab-separated TSV and JSON bundle
   */
  public static exportBundle(
    topic: string,
    cards: SpacedRepetitionCard[]
  ): FlashcardExportBundle {
    const cleanTopic = topic.trim();

    // Anki format: Front \t Back \t Tags
    const lines: string[] = [];
    lines.push(`#separator:tab`);
    lines.push(`#html:false`);
    lines.push(`#tags column:3`);

    for (const card of cards) {
      const cleanFront = card.front.replace(/[\r\n\t]+/g, " ");
      const cleanBack = card.back.replace(/[\r\n\t]+/g, " ");
      const tagStr = card.tags.join(" ") || cleanTopic.replace(/\s+/g, "_");
      lines.push(`${cleanFront}\t${cleanBack}\t${tagStr}`);
    }

    const ankiTsv = lines.join("\n");

    return {
      topic: cleanTopic,
      totalCards: cards.length,
      ankiTsv,
      jsonExport: cards,
      generatedAt: new Date().toISOString(),
    };
  }
}
