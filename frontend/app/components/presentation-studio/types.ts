export type TransitionType = "none" | "morph" | "fade" | "push" | "wipe" | "split" | "reveal";

export type AnimationType = "none" | "appear" | "fadeIn" | "flyIn" | "zoomIn" | "bounce";

export interface SlideElement {
  id: string;
  type: "text" | "textbox" | "shape" | "image" | "table";
  x: number; // percentage or inches
  y: number;
  w?: number;
  h?: number;
  width?: number;
  height?: number;
  content?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fill?: string;
  border?: string;
  stroke?: string;
  shape?: "rectangle" | "rounded" | "circle" | "callout";
  shapeType?: "rectangle" | "rounded" | "circle" | "callout";
  align?: "left" | "center" | "right";
  style?: any;
  animation?: AnimationType;
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
  transition?: TransitionType;
  transitionDuration?: number; // in seconds
  background?: string;
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
  saveStatus: "saved" | "unsaved" | "saving";
}
