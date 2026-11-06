/**
 * Query Processing, Intent Classification & Related Search Generator
 */

import { ImageCategory } from "./types";

const CATEGORY_KEYWORDS: Record<ImageCategory, RegExp[]> = {
  all: [],
  photograph: [/\b(photo|photograph|real|shot|camera|dslr)\b/i],
  illustration: [/\b(illustration|drawing|vector|sketch|clipart|graphic)\b/i],
  wallpaper: [/\b(wallpaper|background|desktop|4k|hd|widescreen)\b/i],
  "3d": [/\b(3d|render|blender|cgi|unreal|model)\b/i],
  nature: [/\b(nature|forest|tree|trees|lake|river|ocean|sea|beach|waterfall|sunset|landscape)\b/i],
  animals: [/\b(animal|animals|dog|cat|bird|lion|tiger|elephant|wildlife|horse|fish|pets)\b/i],
  automotive: [/\b(car|cars|supercar|sports car|bmw|audi|ferrari|porsche|vehicle|truck|motorcycle)\b/i],
  architecture: [/\b(building|architecture|monument|bridge|house|castle|city|skyline|tower)\b/i],
  technology: [/\b(tech|technology|computer|code|robot|ai|chip|gadget|space|telescope|cyber)\b/i],
  people: [/\b(people|person|portrait|man|woman|child|model|face|crowd)\b/i],
  art: [/\b(art|painting|museum|sculpture|vintage|oil painting|artwork)\b/i],
};

const RELATED_SEARCH_MAP: Record<string, string[]> = {
  flower: ["Red roses", "Yellow sunflowers", "Pink tulips", "Lotus flowers", "Flower garden", "Macro flower photography"],
  flowers: ["Red roses", "Yellow sunflowers", "Pink tulips", "Botanical flowers", "Wildflowers", "Flower bouquet"],
  rose: ["Red roses", "White roses", "Rose garden", "Macro rose water drops", "Pink roses", "Vintage roses"],
  sunflower: ["Sunflower field", "Giant sunflower", "Sunflower sunset", "Macro sunflower seeds", "Bee on sunflower"],
  car: ["Sports cars", "Supercars", "Vintage classic cars", "Luxury cars", "Electric vehicles", "Race cars on track"],
  cars: ["Supercars", "Modern sports cars", "Exotic luxury cars", "Classic vintage cars", "Futuristic concept cars"],
  animal: ["Wild animals", "Cute pets", "Baby animals", "Safari animals", "Ocean creatures", "Exotic birds"],
  animals: ["Wildlife photography", "Big cats lions", "Forest animals", "Arctic animals", "Domestic pets", "Tropical birds"],
  mountain: ["Snow covered mountains", "Mountain sunrise", "Rocky mountains", "Himalayas landscape", "Alpine peaks"],
  mountains: ["Himalayas snow peaks", "Mountain lake reflection", "Alps landscape", "Mountain hiking trail", "Dramatic mountain peaks"],
  architecture: ["Modern architecture", "Ancient monuments", "City skylines at night", "Gothic cathedrals", "Futuristic buildings"],
  technology: ["Artificial intelligence", "Quantum computing", "Computer server room", "Robotics and automation", "Space exploration"],
  nature: ["Deep forest landscape", "Tropical beach and sea", "Waterfall in jungle", "Autumn trees landscape", "Sunset over ocean"],
};

export class QueryProcessor {
  /**
   * Cleans and sanitizes natural language prompts into optimized search keywords
   */
  static cleanQuery(query: string): string {
    if (!query) return "";
    let clean = query
      .replace(/^(can you show me|show me|give me|find me|search for|display|i want|please show me|pictures of|photos of|images of)\s+/i, "")
      .replace(/\b(pictures?|photos?|images?|photographs?|wallpaper)\s*(of)?\b/gi, "")
      .replace(/\b(i want|please|kindly|high quality|hd|4k)\b/gi, "")
      .trim();

    clean = clean.replace(/\s+i want$/i, "").trim();
    return clean || query.trim();
  }

  /**
   * Detects the dominant category for the query
   */
  static detectCategory(query: string): ImageCategory {
    const lower = query.toLowerCase();
    for (const [cat, regexes] of Object.entries(CATEGORY_KEYWORDS) as [ImageCategory, RegExp[]][]) {
      if (cat === "all") continue;
      for (const rx of regexes) {
        if (rx.test(lower)) return cat;
      }
    }
    return "all";
  }

  /**
   * Generates smart, high-relevance related searches
   */
  static getRelatedSearches(query: string): string[] {
    const lower = query.toLowerCase().trim();
    for (const [key, related] of Object.entries(RELATED_SEARCH_MAP)) {
      if (lower.includes(key)) {
        return related.filter((r) => r.toLowerCase() !== lower).slice(0, 5);
      }
    }

    // Default dynamic fallbacks
    return [
      `${query} photography`,
      `${query} close up`,
      `${query} landscape`,
      `Beautiful ${query}`,
      `${query} in nature`,
    ];
  }

  /**
   * Generates search suggestions for autocomplete
   */
  static getSuggestions(prefix: string): string[] {
    const clean = prefix.toLowerCase().trim();
    if (!clean) {
      return ["Rose flowers", "Sunflowers", "Sports cars", "Snow mountains", "Wild animals", "Modern architecture"];
    }

    const popular = [
      "Rose flowers",
      "Red roses photography",
      "Sunflowers field",
      "Types of flowers",
      "Sports cars HD",
      "Supercars Ferrari Lamborghini",
      "Snow mountains Alps",
      "Mountain landscape sunset",
      "Forest trees landscape",
      "Wild animals lions tigers",
      "Cute domestic animals",
      "Modern architecture buildings",
      "City skyline night",
      "Technology computers AI",
      "Space stars galaxies",
      "Ocean waves beach",
      "Autumn fall trees",
    ];

    const matched = popular.filter((p) => p.toLowerCase().includes(clean));
    if (matched.length > 0) return matched.slice(0, 6);

    return [
      clean,
      `${clean} photography`,
      `${clean} HD`,
      `${clean} landscape`,
      `Types of ${clean}`,
    ];
  }
}

