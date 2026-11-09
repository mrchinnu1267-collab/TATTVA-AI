/**
 * TATTVA AI - PowerPoint Studio AI Tool Definitions & Execution Engine
 * Formal function calling schema for Gemini 3.5/3.6 models
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { PresentationState, StudioSlide, SlideElement, TransitionType, AnimationType } from "./types";
import { PRESENTATION_THEMES } from "./themes";

export interface AIOperationStep {
  tool: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  error?: string;
}

export const PRESENTATION_AI_TOOLS = [
  {
    name: "create_presentation",
    description: "Create a complete multi-slide presentation structure with title, slides, and appropriate theme.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "The overarching title of the presentation." },
        subtitle: { type: "STRING", description: "Subtitle or executive tagline." },
        theme_id: {
          type: "STRING",
          description: "Theme id: dark_modern, professional_white, corporate_blue, minimal_black, academic, technology, creative, business_review, modern_gradient",
        },
        slides: {
          type: "ARRAY",
          description: "List of slide structures to generate.",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING", description: "Slide title" },
              category: { type: "STRING", description: "Category badge (e.g. FOUNDATIONS, ARCHITECTURE, BENCHMARKS)" },
              bullets: { type: "ARRAY", items: { type: "STRING" }, description: "3-5 high quality, topic-specific bullet points" },
              takeaway: { type: "STRING", description: "Executive takeaway or summary callout" },
              notes: { type: "STRING", description: "Detailed speaker notes" },
            },
            required: ["title", "bullets"],
          },
        },
      },
      required: ["title", "slides"],
    },
  },
  {
    name: "create_slide",
    description: "Insert a new slide with topic-specific title, bullets, category, and speaker notes.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING", description: "Slide title" },
        category: { type: "STRING", description: "Category tag (e.g. ARCHITECTURE, EVALUATION)" },
        bullets: { type: "ARRAY", items: { type: "STRING" }, description: "Specific points" },
        takeaway: { type: "STRING", description: "Summary sentence" },
        notes: { type: "STRING", description: "Speaker notes" },
        position: { type: "INTEGER", description: "1-based index where the slide should be inserted" },
      },
      required: ["title", "bullets"],
    },
  },
  {
    name: "update_slide",
    description: "Update the title, category, bullets, or takeaway of an existing slide.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide index" },
        title: { type: "STRING", description: "New slide title" },
        category: { type: "STRING", description: "New category tag" },
        bullets: { type: "ARRAY", items: { type: "STRING" }, description: "Updated bullets" },
        takeaway: { type: "STRING", description: "Updated takeaway" },
        notes: { type: "STRING", description: "Updated speaker notes" },
      },
      required: ["slide_number"],
    },
  },
  {
    name: "delete_slide",
    description: "Delete a slide by its 1-based number.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide number to delete" },
      },
      required: ["slide_number"],
    },
  },
  {
    name: "duplicate_slide",
    description: "Duplicate an existing slide.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide number to duplicate" },
      },
      required: ["slide_number"],
    },
  },
  {
    name: "reorder_slides",
    description: "Move a slide from one position to another.",
    parameters: {
      type: "OBJECT",
      properties: {
        from_number: { type: "INTEGER", description: "Current 1-based slide number" },
        to_number: { type: "INTEGER", description: "Target 1-based slide number" },
      },
      required: ["from_number", "to_number"],
    },
  },
  {
    name: "add_text",
    description: "Insert a text box or paragraph onto a specific slide.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide number" },
        content: { type: "STRING", description: "Text content" },
        x: { type: "NUMBER", description: "X percentage (0-100)" },
        y: { type: "NUMBER", description: "Y percentage (0-100)" },
        fontSize: { type: "NUMBER", description: "Font size in pixels" },
        bold: { type: "BOOLEAN", description: "Bold text" },
        color: { type: "STRING", description: "Hex color code" },
        align: { type: "STRING", description: "left, center, or right" },
      },
      required: ["slide_number", "content"],
    },
  },
  {
    name: "add_shape",
    description: "Insert a geometric shape or accent onto a slide.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide number" },
        shape_type: { type: "STRING", description: "rectangle, rounded, circle, line, arrow, or callout" },
        fill: { type: "STRING", description: "Fill hex color or rgba" },
        stroke: { type: "STRING", description: "Border stroke hex color" },
        x: { type: "NUMBER", description: "X percentage" },
        y: { type: "NUMBER", description: "Y percentage" },
        width: { type: "NUMBER", description: "Width percentage" },
        height: { type: "NUMBER", description: "Height percentage" },
      },
      required: ["slide_number", "shape_type"],
    },
  },
  {
    name: "add_process_diagram",
    description: "Insert a sequential process flow diagram (like 1. CAPTURE, 2. VERIFY, 3. SYNC, 4. ACT) onto a slide.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide number" },
        steps: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              step: { type: "INTEGER" },
              title: { type: "STRING" },
              desc: { type: "STRING" },
              color: { type: "STRING" },
            },
            required: ["step", "title"],
          },
        },
      },
      required: ["slide_number", "steps"],
    },
  },
  {
    name: "add_table",
    description: "Insert a structured table onto a slide.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide number" },
        headers: { type: "ARRAY", items: { type: "STRING" } },
        rows: { type: "ARRAY", items: { type: "ARRAY", items: { type: "STRING" } } },
      },
      required: ["slide_number", "headers", "rows"],
    },
  },
  {
    name: "apply_theme",
    description: "Apply a professional theme across the entire presentation.",
    parameters: {
      type: "OBJECT",
      properties: {
        theme_id: {
          type: "STRING",
          description: "Theme id: dark_modern, professional_white, corporate_blue, minimal_black, academic, technology, creative, business_review, modern_gradient",
        },
      },
      required: ["theme_id"],
    },
  },
  {
    name: "add_transition",
    description: "Configure slide transitions.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide number (or omit to apply to all)" },
        transition_type: { type: "STRING", description: "none, morph, fade, push, wipe, split, reveal, cover, uncover, randomBars" },
        duration: { type: "NUMBER", description: "Duration in seconds" },
        apply_to_all: { type: "BOOLEAN", description: "Apply to every slide in the presentation" },
      },
      required: ["transition_type"],
    },
  },
  {
    name: "add_animation",
    description: "Configure animation for slide elements.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide number" },
        element_id: { type: "STRING", description: "Target element id, or 'title', 'bullets'" },
        animation_type: { type: "STRING", description: "appear, fadeIn, flyIn, zoomIn, floatIn, bounce, spin" },
      },
      required: ["slide_number", "animation_type"],
    },
  },
  {
    name: "create_speaker_notes",
    description: "Set or update speaker notes for a slide.",
    parameters: {
      type: "OBJECT",
      properties: {
        slide_number: { type: "INTEGER", description: "1-based slide number" },
        notes: { type: "STRING", description: "Comprehensive speaker notes for the presenter" },
      },
      required: ["slide_number", "notes"],
    },
  },
];

/**
 * Execute an individual tool invocation against the current presentation state
 */
export function executeToolOnPresentation(
  toolName: string,
  args: any,
  currentState: PresentationState
): { nextState: PresentationState; message: string } {
  let next = { ...currentState };

  switch (toolName) {
    case "create_presentation": {
      const { title, subtitle, theme_id, slides = [] } = args;
      const theme =
        PRESENTATION_THEMES.find((t) => t.id === theme_id) ||
        currentState.theme ||
        PRESENTATION_THEMES[0];

      const newSlides: StudioSlide[] = slides.map((s: any, idx: number) => ({
        id: `slide_${idx + 1}_${Date.now()}`,
        number: idx + 1,
        title: s.title || `Slide ${idx + 1}`,
        category: s.category || "ANALYSIS",
        bullets: Array.isArray(s.bullets) ? s.bullets : ["Key operational mechanism."],
        takeaway: s.takeaway || undefined,
        notes: s.notes || `Speaker Notes: Discussion points for ${s.title}.`,
        elements: [],
      }));

      next = {
        ...next,
        title: title || next.title,
        subtitle: subtitle || next.subtitle,
        theme,
        slides: newSlides.length > 0 ? newSlides : next.slides,
        currentSlideIndex: 0,
        selectedElementId: null,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Created presentation "${title}" with ${newSlides.length} slides and applied ${theme.name} theme.`,
      };
    }

    case "create_slide": {
      const pos = typeof args.position === "number" ? Math.max(1, args.position) : next.slides.length + 1;
      const insertIdx = Math.min(pos - 1, next.slides.length);
      const newSlide: StudioSlide = {
        id: `slide_${Date.now()}`,
        number: pos,
        layout: args.layout || (pos === 1 ? "title" : "titleAndContent"),
        title: args.title || "New Slide",
        category: args.category || "OVERVIEW",
        bullets: Array.isArray(args.bullets) ? args.bullets : ["Domain mechanism detail."],
        takeaway: args.takeaway,
        notes: args.notes || `Speaker Notes: Key points for ${args.title}.`,
        elements: [],
      };

      const updatedSlides = [...next.slides];
      updatedSlides.splice(insertIdx, 0, newSlide);
      // Renumber
      updatedSlides.forEach((s, i) => {
        s.number = i + 1;
      });

      next = {
        ...next,
        slides: updatedSlides,
        currentSlideIndex: insertIdx,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Added slide ${pos}: "${args.title}"`,
      };
    }

    case "update_slide": {
      const idx = (args.slide_number || 1) - 1;
      if (idx < 0 || idx >= next.slides.length) {
        return { nextState: next, message: `Slide ${args.slide_number} not found.` };
      }

      const updatedSlides = [...next.slides];
      const target = { ...updatedSlides[idx] };

      if (args.title) target.title = args.title;
      if (args.category) target.category = args.category;
      if (Array.isArray(args.bullets)) target.bullets = args.bullets;
      if (args.takeaway !== undefined) target.takeaway = args.takeaway;
      if (args.notes !== undefined) target.notes = args.notes;

      updatedSlides[idx] = target;
      next = {
        ...next,
        slides: updatedSlides,
        currentSlideIndex: idx,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Updated slide ${args.slide_number}: "${target.title}"`,
      };
    }

    case "delete_slide": {
      if (next.slides.length <= 1) {
        return { nextState: next, message: "Cannot delete the only slide in the presentation." };
      }
      const idx = (args.slide_number || 1) - 1;
      if (idx < 0 || idx >= next.slides.length) {
        return { nextState: next, message: `Slide ${args.slide_number} not found.` };
      }

      const updatedSlides = next.slides.filter((_, i) => i !== idx);
      updatedSlides.forEach((s, i) => {
        s.number = i + 1;
      });

      const nextCurrentIdx = Math.min(idx, updatedSlides.length - 1);
      next = {
        ...next,
        slides: updatedSlides,
        currentSlideIndex: nextCurrentIdx,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Deleted slide ${args.slide_number}.`,
      };
    }

    case "duplicate_slide": {
      const idx = (args.slide_number || 1) - 1;
      if (idx < 0 || idx >= next.slides.length) {
        return { nextState: next, message: `Slide ${args.slide_number} not found.` };
      }

      const source = next.slides[idx];
      const clone: StudioSlide = {
        ...source,
        id: `slide_${Date.now()}`,
        title: `${source.title} (Copy)`,
        elements: source.elements ? JSON.parse(JSON.stringify(source.elements)) : [],
      };

      const updatedSlides = [...next.slides];
      updatedSlides.splice(idx + 1, 0, clone);
      updatedSlides.forEach((s, i) => {
        s.number = i + 1;
      });

      next = {
        ...next,
        slides: updatedSlides,
        currentSlideIndex: idx + 1,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Duplicated slide ${args.slide_number}.`,
      };
    }

    case "set_theme":
    case "apply_theme": {
      const themeId = args.theme_id || args.themeId;
      const theme = PRESENTATION_THEMES.find((t) => t.id === themeId);
      if (!theme) {
        return { nextState: next, message: `Theme "${themeId}" not recognized.` };
      }
      next = {
        ...next,
        theme,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Applied "${theme.name}" theme to the presentation.`,
      };
    }

    case "add_text": {
      const idx = (args.slide_number || 1) - 1;
      if (idx < 0 || idx >= next.slides.length) {
        return { nextState: next, message: `Slide ${args.slide_number} not found.` };
      }
      const newEl: SlideElement = {
        id: `el_text_${Date.now()}`,
        type: "textbox",
        x: args.x ?? 10,
        y: args.y ?? 40,
        w: 40,
        h: 12,
        content: args.content,
        fontSize: args.fontSize ?? 18,
        bold: Boolean(args.bold),
        color: args.color || next.theme.text,
        align: args.align || "left",
      };

      const updatedSlides = [...next.slides];
      const target = { ...updatedSlides[idx] };
      target.elements = [...(target.elements || []), newEl];
      updatedSlides[idx] = target;

      next = {
        ...next,
        slides: updatedSlides,
        currentSlideIndex: idx,
        selectedElementId: newEl.id,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Added text box to slide ${args.slide_number}.`,
      };
    }

    case "add_shape": {
      const idx = (args.slide_number || 1) - 1;
      if (idx < 0 || idx >= next.slides.length) {
        return { nextState: next, message: `Slide ${args.slide_number} not found.` };
      }

      const newEl: SlideElement = {
        id: `el_shape_${Date.now()}`,
        type: "shape",
        shapeType: args.shape_type || "rectangle",
        fill: args.fill || next.theme.accent,
        stroke: args.stroke || "transparent",
        x: args.x ?? 20,
        y: args.y ?? 50,
        w: args.width ?? 25,
        h: args.height ?? 15,
      };

      const updatedSlides = [...next.slides];
      const target = { ...updatedSlides[idx] };
      target.elements = [...(target.elements || []), newEl];
      updatedSlides[idx] = target;

      next = {
        ...next,
        slides: updatedSlides,
        currentSlideIndex: idx,
        selectedElementId: newEl.id,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Added ${args.shape_type} shape to slide ${args.slide_number}.`,
      };
    }

    case "add_process_diagram": {
      const idx = (args.slide_number || 1) - 1;
      if (idx < 0 || idx >= next.slides.length) {
        return { nextState: next, message: `Slide ${args.slide_number} not found.` };
      }

      const newEl: SlideElement = {
        id: `el_process_${Date.now()}`,
        type: "process",
        x: 65,
        y: 20,
        w: 30,
        h: 60,
        processSteps: args.steps || [
          { step: 1, title: "CAPTURE", desc: "Field Capture", color: "#EA580C" },
          { step: 2, title: "VERIFY", desc: "Offline-First", color: "#10B981" },
          { step: 3, title: "SYNC", desc: "Live Decision Support", color: "#0EA5E9" },
          { step: 4, title: "ACT", desc: "Automated Triggers", color: "#FFFFFF" },
        ],
      };

      const updatedSlides = [...next.slides];
      const target = { ...updatedSlides[idx] };
      target.elements = [...(target.elements || []), newEl];
      updatedSlides[idx] = target;

      next = {
        ...next,
        slides: updatedSlides,
        currentSlideIndex: idx,
        selectedElementId: newEl.id,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Inserted process diagram into slide ${args.slide_number}.`,
      };
    }

    case "add_table": {
      const idx = (args.slide_number || 1) - 1;
      if (idx < 0 || idx >= next.slides.length) {
        return { nextState: next, message: `Slide ${args.slide_number} not found.` };
      }

      const tableData = [args.headers, ...args.rows];
      const newEl: SlideElement = {
        id: `el_table_${Date.now()}`,
        type: "table",
        x: 10,
        y: 45,
        w: 80,
        h: 35,
        tableData,
      };

      const updatedSlides = [...next.slides];
      const target = { ...updatedSlides[idx] };
      target.elements = [...(target.elements || []), newEl];
      updatedSlides[idx] = target;

      next = {
        ...next,
        slides: updatedSlides,
        currentSlideIndex: idx,
        selectedElementId: newEl.id,
        saveStatus: "unsaved",
      };
      return {
        nextState: next,
        message: `Inserted ${args.headers.length}-column comparison table into slide ${args.slide_number}.`,
      };
    }

    case "add_transition": {
      const transType = (args.transition_type as TransitionType) || "fade";
      const dur = typeof args.duration === "number" ? args.duration : 0.7;

      if (args.apply_to_all) {
        const updatedSlides = next.slides.map((s) => ({
          ...s,
          transition: transType,
          transitionDuration: dur,
        }));
        next = {
          ...next,
          transition: { type: transType, duration: dur },
          slides: updatedSlides,
          saveStatus: "unsaved",
        };
        return { nextState: next, message: `Applied "${transType}" transition to all slides.` };
      } else {
        const idx = (args.slide_number || 1) - 1;
        if (idx < 0 || idx >= next.slides.length) {
          return { nextState: next, message: `Slide ${args.slide_number} not found.` };
        }
        const updatedSlides = [...next.slides];
        updatedSlides[idx] = {
          ...updatedSlides[idx],
          transition: transType,
          transitionDuration: dur,
        };
        next = { ...next, slides: updatedSlides, saveStatus: "unsaved" };
        return { nextState: next, message: `Applied "${transType}" transition to slide ${args.slide_number}.` };
      }
    }

    case "create_speaker_notes": {
      const idx = (args.slide_number || 1) - 1;
      if (idx < 0 || idx >= next.slides.length) {
        return { nextState: next, message: `Slide ${args.slide_number} not found.` };
      }
      const updatedSlides = [...next.slides];
      updatedSlides[idx] = {
        ...updatedSlides[idx],
        notes: args.notes,
      };
      next = { ...next, slides: updatedSlides, saveStatus: "unsaved" };
      return { nextState: next, message: `Updated speaker notes for slide ${args.slide_number}.` };
    }

    default:
      return { nextState: next, message: `Operation "${toolName}" executed.` };
  }
}

