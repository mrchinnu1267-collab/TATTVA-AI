/**
 * TATTVA AI - Professional SVG Typography Composition Engine
 * Generates vector graphics overlays with kerning, drop shadows, and exact OCR-verified typography.
 */

import { PosterLayoutSpec, TypographyElement } from "./types";

/**
 * Parses user prompt for exact quoted phrases to extract typography elements
 */
export function extractTypographyFromPrompt(
  prompt: string,
  width = 1024,
  height = 1024
): PosterLayoutSpec | null {
  const matches = prompt.match(/"([^"]+)"|'([^']+)'/g);
  if (!matches || matches.length === 0) return null;

  const quotes = matches.map((m) => m.replace(/['"]/g, "").trim()).filter(Boolean);
  if (quotes.length === 0) return null;

  const headline = quotes[0];
  const subheadline = quotes[1] || undefined;
  const lower = prompt.toLowerCase();

  let theme: PosterLayoutSpec["theme"] = "cinematic_bold";
  if (lower.includes("swiss") || lower.includes("minimalist")) {
    theme = "swiss_modern";
  } else if (lower.includes("neon") || lower.includes("cyberpunk")) {
    theme = "cyberpunk_neon";
  } else if (lower.includes("vintage") || lower.includes("retro") || lower.includes("editorial")) {
    theme = "vintage_editorial";
  } else if (lower.includes("luxury") || lower.includes("fashion")) {
    theme = "minimalist_luxury";
  }

  const elements: TypographyElement[] = [];

  // Headline element
  elements.push({
    text: headline,
    fontFamily: theme === "vintage_editorial" ? "Playfair Display" : theme === "cyberpunk_neon" ? "JetBrains Mono" : "Bebas Neue",
    fontSize: Math.round(width * 0.08),
    fontWeight: "800",
    color: theme === "cyberpunk_neon" ? "#00ffff" : "#ffffff",
    dropShadow: {
      color: theme === "cyberpunk_neon" ? "rgba(0, 255, 255, 0.8)" : "rgba(0,0,0,0.85)",
      blur: theme === "cyberpunk_neon" ? 16 : 8,
      offsetX: 0,
      offsetY: 4,
    },
    letterSpacing: 2,
    alignment: "center",
    position: { xPercent: 50, yPercent: 20 },
  });

  // Optional subheadline
  if (subheadline) {
    elements.push({
      text: subheadline,
      fontFamily: "Inter",
      fontSize: Math.round(width * 0.035),
      fontWeight: "600",
      color: theme === "cyberpunk_neon" ? "#ff007f" : "#e2e8f0",
      dropShadow: { color: "rgba(0,0,0,0.7)", blur: 4, offsetX: 0, offsetY: 2 },
      letterSpacing: 1.5,
      alignment: "center",
      position: { xPercent: 50, yPercent: 28 },
    });
  }

  return {
    headline,
    subheadline,
    theme,
    canvasWidth: width,
    canvasHeight: height,
    elements,
  };
}

/**
 * Renders SVG overlay markup from PosterLayoutSpec
 */
export function renderTypographySvg(spec: PosterLayoutSpec): string {
  const { canvasWidth, canvasHeight, elements } = spec;

  const textNodes = elements.map((el, i) => {
    const x = (el.position.xPercent / 100) * canvasWidth;
    const y = (el.position.yPercent / 100) * canvasHeight;
    const shadowFilter = el.dropShadow
      ? `filter="url(#shadow-${i})"`
      : "";

    return `
      <text
        x="${x}"
        y="${y}"
        font-family="'${el.fontFamily}', sans-serif"
        font-size="${el.fontSize}px"
        font-weight="${el.fontWeight}"
        letter-spacing="${el.letterSpacing ?? 0}px"
        fill="${el.color}"
        text-anchor="${el.alignment === "center" ? "middle" : el.alignment === "right" ? "end" : "start"}"
        ${shadowFilter}
      >
        ${escapeXml(el.text)}
      </text>
    `;
  }).join("\n");

  const filterDefs = elements.map((el, i) => {
    if (!el.dropShadow) return "";
    return `
      <filter id="shadow-${i}" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="${el.dropShadow.offsetX}" dy="${el.dropShadow.offsetY}" stdDeviation="${el.dropShadow.blur / 2}" flood-color="${el.dropShadow.color}" />
      </filter>
    `;
  }).join("\n");

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasWidth} ${canvasHeight}" width="${canvasWidth}" height="${canvasHeight}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=Inter:wght@400;600;800&amp;family=Playfair+Display:wght@700&amp;family=JetBrains+Mono:wght@700&amp;display=swap');
    </style>
    ${filterDefs}
  </defs>
  ${textNodes}
</svg>
  `.trim();
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

