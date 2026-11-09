export type TransitionType =
  | "none"
  | "morph"
  | "fade"
  | "push"
  | "wipe"
  | "split"
  | "reveal"
  | "cover"
  | "uncover"
  | "randomBars";

export type AnimationType =
  | "none"
  | "appear"
  | "fadeIn"
  | "flyIn"
  | "zoomIn"
  | "floatIn"
  | "bounce"
  | "spin";

export type ViewMode = "normal" | "slideSorter" | "readingView" | "slideShow";

export interface DrawingPath {
  id: string;
  tool: "pen" | "highlighter" | "eraser";
  color: string;
  width: number;
  points: Array<{ x: number; y: number }>;
}

export interface SlideElement {
  id: string;
  type: "text" | "textbox" | "shape" | "image" | "table" | "chart" | "process" | "diagram";
  x: number; // percentage (0 - 100) or pixels
  y: number;
  w?: number;
  h?: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: string;
  fill?: string;
  border?: string;
  stroke?: string;
  strokeWidth?: number;
  shape?: "rectangle" | "rounded" | "circle" | "callout" | "line" | "arrow";
  shapeType?: "rectangle" | "rounded" | "circle" | "callout" | "line" | "arrow";
  align?: "left" | "center" | "right" | "justify";
  rotation?: number;
  zIndex?: number;
  style?: Record<string, any>;
  animation?: AnimationType;
  animationOrder?: number;
  animationDuration?: number;
  // Specific data for tables, charts, or process flows
  tableData?: string[][];
  chartData?: { labels: string[]; values: number[]; title?: string };
  processSteps?: Array<{ step: number; title: string; desc?: string; color?: string }>;
}

export interface SlideComment {
  id: string;
  author: string;
  authorInitials: string;
  text: string;
  date: string;
  resolved?: boolean;
}

export interface StudioSlide {
  id: string;
  number: number;
  title: string;
  category?: string;
  bullets: string[];
  takeaway?: string;
  notes?: string;
  elements?: SlideElement[];
  drawings?: DrawingPath[];
  transition?: TransitionType;
  transitionDuration?: number; // in seconds
  background?: string;
  layout?: "title" | "titleAndContent" | "sectionHeader" | "twoContent" | "comparison" | "blank";
  isHidden?: boolean;
  comments?: SlideComment[];
}

export interface PresentationTheme {
  id: string;
  name: string;
  bg: string;
  isDark: boolean;
  cardBg: string;
  cardBorder: string;
  text: string;
  subtext: string;
  accent: string;
  accentBadge: string;
  fontFamily: string;
  gradient?: string;
}

export interface PresentationState {
  id: string;
  title: string;
  subtitle: string;
  theme: PresentationTheme;
  transition: {
    type: TransitionType;
    duration: number;
  };
  slides: StudioSlide[];
  currentSlideIndex: number;
  selectedElementId: string | null;
  zoom: number;
  showNotes: boolean;
  showThumbnails: boolean;
  isSlideShow: boolean;
  viewMode: ViewMode;
  saveStatus: "saved" | "unsaved" | "saving" | "failed";
  autoSave: boolean;
  showRuler: boolean;
  showGridlines: boolean;
  showGuides: boolean;
  drawingTool: "none" | "pen" | "highlighter" | "eraser";
  drawingColor: string;
  drawingWidth: number;
}
