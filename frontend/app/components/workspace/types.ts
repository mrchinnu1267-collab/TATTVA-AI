export type WorkspaceAppId =
  | "word"
  | "excel"
  | "powerpoint"
  | "outlook"
  | "onenote"
  | "publisher"
  | "access";

export interface WorkspaceAppMeta {
  id: WorkspaceAppId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  letter: string;
  color: string;
  accentBg: string;
  badgeClass: string;
  defaultFormat: string;
  supportedFormats: string[];
}

export interface WorkspaceItem<T = any> {
  id: string;
  name: string;
  description?: string;
  app: WorkspaceAppId;
  format: string;
  content: T;
  sizeBytes: number;
  isStarred: boolean;
  isPinned: boolean;
  isShared: boolean;
  isTrashed: boolean;
  trashedAt?: string;
  tags: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 1. WORD TYPES
// -----------------------------------------------------------------------------
export interface WordDocumentContent {
  title: string;
  author?: string;
  html: string;
  fontSize?: number;
  fontFamily?: string;
  margins?: "normal" | "narrow" | "moderate" | "wide";
  orientation?: "portrait" | "landscape";
  showLineNumbers?: boolean;
  headerText?: string;
  footerText?: string;
  pageNumberPosition?: "none" | "top" | "bottom";
  wordCount?: number;
  charCount?: number;
  footnotes?: Array<{ id: string; text: string }>;
  comments?: Array<{ id: string; author: string; text: string; date: string }>;
}

// -----------------------------------------------------------------------------
// 2. EXCEL TYPES
// -----------------------------------------------------------------------------
export type CellValue = string | number | boolean | null | undefined;

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  bg?: string;
  align?: "left" | "center" | "right";
  format?: "general" | "number" | "currency" | "percent" | "date";
}

export interface SpreadsheetSheet {
  id: string;
  title: string;
  rows: CellValue[][];
  formulas?: Record<string, string>; // "A1" -> "=SUM(B1:B10)"
  styles?: Record<string, CellStyle>; // "A1" -> CellStyle
  colWidths?: Record<number, number>;
  rowHeights?: Record<number, number>;
}

export interface SpreadsheetChart {
  id: string;
  title: string;
  type: "bar" | "line" | "pie" | "area" | "scatter";
  range: string; // e.g. "A1:B6"
  seriesName?: string;
}

export interface SpreadsheetContent {
  sheets: SpreadsheetSheet[];
  activeSheetIndex: number;
  charts?: SpreadsheetChart[];
  frozenRows?: number;
  frozenCols?: number;
}

// -----------------------------------------------------------------------------
// 3. POWERPOINT TYPES (Integrated with Presentation Studio)
// -----------------------------------------------------------------------------
export interface PresentationContent {
  title: string;
  themeId: string;
  slides: Array<{
    id?: string;
    number?: number;
    title: string;
    category?: string;
    bullets: string[];
    takeaway?: string;
    notes?: string;
    elements?: any[];
  }>;
}

// -----------------------------------------------------------------------------
// 4. OUTLOOK TYPES
// -----------------------------------------------------------------------------
export interface OutlookEmail {
  id: string;
  folder: "inbox" | "sent" | "drafts" | "archive" | "trash" | "spam";
  subject: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  body: string;
  html?: string;
  isRead: boolean;
  isStarred: boolean;
  timestamp: string;
  attachments?: Array<{ name: string; sizeBytes: number; type: string; url?: string }>;
  status: "draft" | "delivered" | "scheduled";
  tags?: string[];
}

export interface OutlookEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  isAllDay: boolean;
  recurring: "none" | "daily" | "weekly" | "monthly" | "yearly";
  reminderMinutes: number;
  attendees: string[];
  color: string;
}

export interface OutlookContact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
  group: string;
  isFavorite: boolean;
}

// -----------------------------------------------------------------------------
// 5. ONENOTE TYPES
// -----------------------------------------------------------------------------
export interface OneNotePage {
  id: string;
  title: string;
  updatedAt: string;
  content: string; // Rich text / markdown / HTML
  checklist?: Array<{ id: string; text: string; done: boolean }>;
  drawings?: Array<{ id: string; points: Array<{ x: number; y: number }>; color: string; width: number }>;
  tags?: string[];
  isPinned?: boolean;
}

export interface OneNoteSection {
  id: string;
  title: string;
  color: string;
  pages: OneNotePage[];
}

export interface OneNoteNotebook {
  id: string;
  title: string;
  color: string;
  sections: OneNoteSection[];
}

// -----------------------------------------------------------------------------
// 6. PUBLISHER TYPES
// -----------------------------------------------------------------------------
export type PublisherTemplateType =
  | "poster_a4"
  | "poster_a3"
  | "academic_poster"
  | "flyer"
  | "brochure_trifold"
  | "invitation"
  | "certificate"
  | "business_card"
  | "newsletter";

export interface PublisherElement {
  id: string;
  type: "text" | "heading" | "image" | "shape" | "badge" | "divider";
  x: number; // percentage (0 - 100)
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotation?: number;
  content?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
  shapeType?: "rectangle" | "rounded" | "circle" | "star" | "banner";
  align?: "left" | "center" | "right";
  imageUrl?: string;
  locked?: boolean;
}

export interface PublisherPublication {
  id: string;
  title: string;
  templateType: PublisherTemplateType;
  dimensions: { width: number; height: number; unit: "px" | "mm" | "in" };
  background: string;
  elements: PublisherElement[];
}

// -----------------------------------------------------------------------------
// 7. ACCESS TYPES
// -----------------------------------------------------------------------------
export type AccessDataType = "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "RELATION" | "JSON";

export interface AccessField {
  name: string;
  type: AccessDataType;
  isPrimary?: boolean;
  isNullable?: boolean;
  defaultValue?: any;
  references?: { table: string; field: string };
}

export interface AccessTable {
  id: string;
  name: string;
  fields: AccessField[];
  records: Record<string, any>[];
}

export interface AccessRelationship {
  id: string;
  fromTable: string;
  fromField: string;
  toTable: string;
  toField: string;
  type: "one_to_one" | "one_to_many" | "many_to_many";
}

export interface AccessQuery {
  id: string;
  name: string;
  sql: string;
  createdAt: string;
}

export interface AccessDatabase {
  id: string;
  title: string;
  description?: string;
  tables: AccessTable[];
  relationships: AccessRelationship[];
  savedQueries: AccessQuery[];
}

