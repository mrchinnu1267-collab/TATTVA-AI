/**
 * TATTVA AI - Professional Typography & Vector Composition Engine
 * Types & Rendering Specifications
 */

export interface TypographyElement {
  text: string;
  fontFamily: "Inter" | "Playfair Display" | "Bebas Neue" | "Montserrat" | "Cinzel" | "JetBrains Mono";
  fontSize: number; // in pt / px
  fontWeight: "bold" | "normal" | "600" | "800";
  color: string;
  dropShadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
  letterSpacing?: number;
  alignment: "center" | "left" | "right";
  position: {
    xPercent: number; // 0 - 100
    yPercent: number; // 0 - 100
  };
  badgeBackground?: {
    fillColor: string;
    strokeColor: string;
    borderRadius: number;
    padding: number;
  };
}

export interface PosterLayoutSpec {
  headline: string;
  subheadline?: string;
  tagline?: string;
  theme: "swiss_modern" | "cyberpunk_neon" | "vintage_editorial" | "cinematic_bold" | "minimalist_luxury";
  canvasWidth: number;
  canvasHeight: number;
  elements: TypographyElement[];
}

