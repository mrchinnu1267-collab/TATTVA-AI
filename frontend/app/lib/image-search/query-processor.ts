/**
 * Query Processing, Intent Classification, Precision Entity Expansion & Filter Rules
 */

import { ImageCategory, ImageSearchResultItem } from "./types";

export interface SubEntityQuery {
  searchQuery: string;
  label: string;
}

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
      .replace(/^(if i ask|can you show me|show me|give me|find me|search for|display|i want|please show me|tell me about|what are)\s+/i, "")
      .replace(/\b(pictures?|photos?|images?|photographs?|wallpaper)\s*(of)?\b/gi, "")
      .replace(/\b(i want|please|kindly|high quality|hd|4k)\b/gi, "")
      .trim();

    clean = clean.replace(/\s+i want$/i, "").replace(/\s+please$/i, "").trim();
    return clean || query.trim();
  }

  /**
   * If a user asks for a category/collection (e.g. "different types of flowers", "different animals", "sports cars"),
   * expands it into iconic, high-accuracy sub-entities so the user receives 100% accurate, diverse photographs.
   */
  static getExpandedSubEntities(query: string): SubEntityQuery[] | null {
    const lower = query.toLowerCase().trim();

    // 1. Flowers (e.g. "if i ask different types of flowers i want", "different types of flowers", "flowers")
    if (/\b(different (types|kinds|varieties) of flowers?|types of flowers?|kinds of flowers?|various flowers?|flowers?|flowering plants?)\b/i.test(lower)) {
      return [
        { searchQuery: "Red rose flower close-up photography", label: "Red Rose" },
        { searchQuery: "Sunflower blooming field", label: "Sunflower" },
        { searchQuery: "Pink tulip flower bloom", label: "Pink Tulip" },
        { searchQuery: "Lotus flower water bloom", label: "Lotus Flower" },
        { searchQuery: "Orchid flower bloom", label: "Orchid" },
        { searchQuery: "Lavender flowers field", label: "Lavender" },
      ];
    }

    // 2. Animals / Wildlife
    if (/\b(different (types|kinds|varieties) of animals?|types of animals?|kinds of animals?|wild animals?|animals?|wildlife)\b/i.test(lower)) {
      return [
        { searchQuery: "Male African lion wildlife", label: "African Lion" },
        { searchQuery: "Bengal tiger portrait wildlife", label: "Bengal Tiger" },
        { searchQuery: "African elephant wildlife safari", label: "African Elephant" },
        { searchQuery: "Giraffe wildlife savanna", label: "Giraffe" },
        { searchQuery: "Giant panda eating bamboo", label: "Giant Panda" },
        { searchQuery: "Plains zebra wildlife", label: "Plains Zebra" },
      ];
    }

    // 3. Sports cars / Supercars
    if (/\b(different (types|kinds|varieties) of (sports )?cars?|types of (sports )?cars?|sports cars?|supercars?|exotic cars?)\b/i.test(lower)) {
      return [
        { searchQuery: "Ferrari sports car road", label: "Ferrari" },
        { searchQuery: "Lamborghini supercar road", label: "Lamborghini" },
        { searchQuery: "Porsche 911 sports car", label: "Porsche 911" },
        { searchQuery: "Bugatti Chiron supercar", label: "Bugatti Chiron" },
        { searchQuery: "McLaren sports car track", label: "McLaren" },
      ];
    }

    // 4. Birds
    if (/\b(different (types|kinds|varieties) of birds?|types of birds?|kinds of birds?|birds?|wild birds?)\b/i.test(lower)) {
      return [
        { searchQuery: "Indian peacock peafowl feathers", label: "Peacock" },
        { searchQuery: "Bald eagle flying sky", label: "Bald Eagle" },
        { searchQuery: "Common kingfisher perched bird", label: "Kingfisher" },
        { searchQuery: "Greater flamingo bird water", label: "Flamingo" },
        { searchQuery: "Scarlet macaw parrot colorful", label: "Scarlet Macaw" },
      ];
    }

    // 5. Mountains
    if (/\b(different (types|kinds) of mountains?|types of mountains?|mountains?|mountain peaks?)\b/i.test(lower)) {
      return [
        { searchQuery: "Mount Everest Himalayan summit", label: "Mount Everest" },
        { searchQuery: "Matterhorn mountain peak Swiss Alps", label: "Matterhorn" },
        { searchQuery: "Mount Fuji snow Japan", label: "Mount Fuji" },
        { searchQuery: "Dolomites mountain range landscape", label: "Dolomites" },
      ];
    }

    // 6. Forests
    if (/\b(different (types|kinds) of forests?|types of forests?|forests?|forest landscapes?)\b/i.test(lower)) {
      return [
        { searchQuery: "Redwood national park forest trees", label: "Redwood Forest" },
        { searchQuery: "Misty pine forest landscape", label: "Pine Forest" },
        { searchQuery: "Autumn forest trees foliage", label: "Autumn Woodland" },
        { searchQuery: "Bamboo forest grove path", label: "Bamboo Forest" },
      ];
    }

    // 7. Monuments / Famous Architecture
    if (/\b(different (types|kinds) of (monuments|architecture|buildings)|famous monuments?|world wonders?|famous buildings?|famous landmarks?)\b/i.test(lower)) {
      return [
        { searchQuery: "Taj Mahal Agra India morning", label: "Taj Mahal" },
        { searchQuery: "Eiffel Tower Paris France sky", label: "Eiffel Tower" },
        { searchQuery: "Colosseum Rome Italy amphitheatre", label: "Colosseum" },
        { searchQuery: "Pyramids of Giza Egypt desert", label: "Pyramids of Giza" },
        { searchQuery: "Sydney Opera House Australia harbor", label: "Sydney Opera House" },
      ];
    }

    // 8. Fruits
    if (/\b(different (types|kinds|varieties) of fruits?|types of fruits?|fruits?)\b/i.test(lower)) {
      return [
        { searchQuery: "Fresh red apple fruit branch", label: "Red Apple" },
        { searchQuery: "Ripe mango fruit tree", label: "Mango" },
        { searchQuery: "Fresh ripe bananas cluster", label: "Bananas" },
        { searchQuery: "Fresh ripe strawberries red", label: "Strawberries" },
        { searchQuery: "Fresh orange fruit tree", label: "Orange" },
      ];
    }

    return null;
  }

  /**
   * Filters out low-quality, unusual, or archival document images from Wikimedia & Openverse
   */
  static isUnusualOrJunkImage(item: ImageSearchResultItem): boolean {
    const title = (item.title || "").toLowerCase();
    const url = (item.url || "").toLowerCase();

    // 0. Non-photo document formats (DJVU books, PDF documents, vector SVGs, audio/video)
    if (/\.(djvu|pdf|ogg|ogv|webm|svg|tif|tiff)(\?|$)/i.test(url)) return true;
    if (/\b(djvu|book|volume|alcott|scanned pages?|frontispiece|title page)\b/i.test(title)) return true;

    // 1. Historical medical/archive scans (e.g. Wellcome library drawings/scans)
    if (/\b(wellcome|v00\d+|v004|v002|v003|v001|v005|manuscript|parchment|microfilm)\b/i.test(title + " " + url)) return true;
    if (/\b(lithograph|engraving|woodcut|etching|scan of|page from|plate \d+|figure \d+|fig\.\s*\d+)\b/i.test(title)) return true;
    if (/\b(herbarium|specimen|fossil|skeleton|taxidermy|dissection)\b/i.test(title)) return true;

    // 2. Administrative, maps, charts, emblems, stamps, coins
    if (/\b(postage stamp|stamp of|coin of|banknote|numismatic|token|currency)\b/i.test(title)) return true;
    if (/\b(coat of arms|flag of|seal of|symbol of|insignia|emblem|crest of)\b/i.test(title)) return true;
    if (/\b(map of|diagram|chart|graph|infographic|census|schematic|blueprint|table of)\b/i.test(title)) return true;
    if (/\b(receipt|invoice|ticket|passport|license plate|form|document)\b/i.test(title)) return true;

    // 3. Cemetery, tombstone, memorial plaque
    if (/\b(tombstone|cemetery|graveyard|grave of|memorial plaque|epitaph)\b/i.test(title)) return true;

    // 4. Clipart, cartoons, drawings
    if (/\b(clipart|icon|cartoon|vector graphic)\b/i.test(title)) return true;

    // 5. Raw amateur camera dumps with date timestamps or codes (e.g. "2020-04-09 12 27 20 A garden...")
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}\s+\d{2}/.test(item.title.trim())) return true;
    if (/^(IMG|DSC|P|SAM|DJI|WP)_\d{4,}/i.test(item.title.trim())) return true;

    // 6. Broken or excessively tiny thumbnails
    if (item.width && item.height && (item.width < 250 || item.height < 200)) return true;

    return false;
  }

  /**
   * Cleans raw Wikimedia/Openverse filenames into beautiful human-readable titles
   */
  static cleanImageTitle(rawTitle: string): string {
    let title = rawTitle
      .replace(/^File:/i, "")
      .replace(/\.[a-zA-Z0-9]{3,4}$/, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b(Wellcome\s+V\d+|D\d+\s+\d+|IITMandi\s+Himachal\s+Aug\d+.*)\b/gi, "")
      .replace(/\s*\([^)]*\)$/, "")
      .trim();

    if (title.length > 55) {
      const cut = title.slice(0, 50);
      const lastComma = cut.lastIndexOf(",");
      if (lastComma > 25) {
        title = cut.slice(0, lastComma);
      } else {
        title = cut.trim() + "...";
      }
    }

    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    return title || "Photograph";
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
      "Different types of flowers",
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
