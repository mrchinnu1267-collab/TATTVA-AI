import { WorkspaceItem, WorkspaceAppId } from "./types";

const LOCAL_STORAGE_KEY = "tattva_workspace_items_v1";

/**
 * Default starter documents demonstrating genuine working capability in each app
 */
export const STARTER_ITEMS: WorkspaceItem[] = [
  // 1. Word Starter
  {
    id: "doc_word_annual_report",
    name: "TATTVA AI Comprehensive Report",
    description: "Multi-section technical dossier with executive summary and structured analysis.",
    app: "word",
    format: "docx",
    sizeBytes: 18450,
    isStarred: true,
    isPinned: true,
    isShared: false,
    isTrashed: false,
    tags: ["Report", "Academic", "AI"],
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    content: {
      title: "Autonomous Intelligence Systems: Architecture & Governance",
      author: "TATTVA AI Research Division",
      margins: "normal",
      orientation: "portrait",
      html: `<h1>Autonomous Intelligence Systems: Architecture & Governance</h1>
<p class="lead">An authoritative overview of modern cognitive architectures, tool-use execution, and safety frameworks.</p>
<hr />
<h2>1. Executive Summary</h2>
<p>Modern autonomous agents represent a profound architectural evolution beyond single-turn language models. By integrating continuous multi-step planning, working memory vectors, and bidirectional tool interfaces, agentic systems solve complex, non-deterministic tasks with verifiable empirical outcomes.</p>
<h2>2. Primary Architectural Subsystems</h2>
<ul>
  <li><strong>Cognitive Core:</strong> High-throughput reasoning and instruction interpretation.</li>
  <li><strong>Memory Vault:</strong> Hybrid short-term context buffers and long-term vector embeddings.</li>
  <li><strong>Tool Environment:</strong> Strictly typed APIs, sandboxed runtimes, and validation guardrails.</li>
</ul>
<blockquote>"Verification is the bedrock of autonomous intelligence." — TATTVA Governance Blueprint</blockquote>
<h2>3. Operational Benchmark Metrics</h2>
<p>The table below summarizes latency, throughput, and error tolerance across baseline deployments:</p>
<table border="1" cellpadding="6" style="border-collapse: collapse; width: 100%;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th>Subsystem</th>
      <th>P95 Latency</th>
      <th>Throughput (req/s)</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Model Router</td>
      <td>1.2s</td>
      <td>450</td>
      <td>Optimal</td>
    </tr>
    <tr>
      <td>Python Bridge Engine</td>
      <td>35ms</td>
      <td>1,800</td>
      <td>Optimal</td>
    </tr>
    <tr>
      <td>Storage Vault Sync</td>
      <td>180ms</td>
      <td>620</td>
      <td>Verified</td>
    </tr>
  </tbody>
</table>
<p><br />Report compiled and formatted with TATTVA Word Editor.</p>`,
      wordCount: 220,
      charCount: 1640,
    },
  },

  // 2. Excel Starter
  {
    id: "doc_excel_quarterly_budget",
    name: "Enterprise Financial Projections & KPIs",
    description: "Financial model with automatic formula calculations and bar chart visualization.",
    app: "excel",
    format: "xlsx",
    sizeBytes: 24500,
    isStarred: true,
    isPinned: true,
    isShared: false,
    isTrashed: false,
    tags: ["Finance", "Budget", "Formulas"],
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    content: {
      activeSheetIndex: 0,
      sheets: [
        {
          id: "sheet_1",
          title: "Revenue & Margins",
          rows: [
            ["Metric", "Q1 Actual", "Q2 Actual", "Q3 Target", "Q4 Target", "Total / Metric"],
            ["Subscription Revenue", 125000, 148000, 185000, 230000, "=SUM(B2:E2)"],
            ["Enterprise Licences", 85000, 95000, 120000, 160000, "=SUM(B3:E3)"],
            ["API Token Compute", 45000, 62000, 80000, 110000, "=SUM(B4:E4)"],
            ["Total Gross Revenue", "=SUM(B2:B4)", "=SUM(C2:C4)", "=SUM(D2:D4)", "=SUM(E2:E4)", "=SUM(F2:F4)"],
            ["Direct Cost of Goods", 62000, 78000, 95000, 125000, "=SUM(B6:E6)"],
            ["Net Operating Margin", "=B5-B6", "=C5-C6", "=D5-D6", "=E5-E6", "=B7+C7+D7+E7"],
            ["Average Quarterly Margin", "=AVERAGE(B7:E7)", "", "", "", ""],
          ],
          formulas: {
            F2: "=SUM(B2:E2)",
            F3: "=SUM(B3:E3)",
            F4: "=SUM(B4:E4)",
            B5: "=SUM(B2:B4)",
            C5: "=SUM(C2:C4)",
            D5: "=SUM(D2:D4)",
            E5: "=SUM(E2:E4)",
            F5: "=SUM(F2:F4)",
            F6: "=SUM(B6:E6)",
            B7: "=B5-B6",
            C7: "=C5-C6",
            D7: "=D5-D6",
            E7: "=E5-E6",
            F7: "=B7+C7+D7+E7",
            B8: "=AVERAGE(B7:E7)",
          },
          styles: {
            A1: { bold: true, bg: "#107C41", color: "#FFFFFF" },
            B1: { bold: true, bg: "#107C41", color: "#FFFFFF", align: "right" },
            C1: { bold: true, bg: "#107C41", color: "#FFFFFF", align: "right" },
            D1: { bold: true, bg: "#107C41", color: "#FFFFFF", align: "right" },
            E1: { bold: true, bg: "#107C41", color: "#FFFFFF", align: "right" },
            F1: { bold: true, bg: "#107C41", color: "#FFFFFF", align: "right" },
            A5: { bold: true },
            B5: { bold: true, format: "currency" },
            C5: { bold: true, format: "currency" },
            D5: { bold: true, format: "currency" },
            E5: { bold: true, format: "currency" },
            F5: { bold: true, format: "currency" },
            A7: { bold: true },
            B7: { bold: true, format: "currency" },
            C7: { bold: true, format: "currency" },
            D7: { bold: true, format: "currency" },
            E7: { bold: true, format: "currency" },
            F7: { bold: true, format: "currency" },
          },
        },
      ],
      charts: [
        {
          id: "chart_1",
          title: "Quarterly Revenue Growth",
          type: "bar",
          range: "A1:E5",
          seriesName: "Total Gross Revenue",
        },
      ],
    },
  },

  // 3. PowerPoint Starter
  {
    id: "doc_ppt_agentic_ai_deck",
    name: "Agentic AI Executive Presentation",
    description: "6-slide widescreen presentation deck with dark theme and structured milestones.",
    app: "powerpoint",
    format: "pptx",
    sizeBytes: 36200,
    isStarred: true,
    isPinned: false,
    isShared: false,
    isTrashed: false,
    tags: ["Slides", "AI", "Executive"],
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    content: {
      title: "Agentic AI Architecture & Capabilities",
      themeId: "dark_modern",
      slides: [
        {
          number: 1,
          title: "Agentic AI: Systems & Paradigms",
          category: "EXECUTIVE BRIEF",
          bullets: [
            "Next-generation AI transitioning from passive responses to proactive agency.",
            "Autonomous goal decomposition and iterative self-reflection.",
            "Standard OpenXML PPTX compiled with TATTVA Presentation Studio.",
          ],
          takeaway: "Empowering software systems with autonomous reasoning and reliable tool use.",
          notes: "Speaker Notes: Welcome stakeholders and introduce the scope of agentic computing.",
        },
        {
          number: 2,
          title: "Core Cognitive Architecture",
          category: "ARCHITECTURE",
          bullets: [
            "Foundation models serve as central natural language processing engines.",
            "Hierarchical planners break macro objectives into sequential sub-tasks.",
            "Memory modules retain context across long multi-turn interactions.",
          ],
          takeaway: "Modularity ensures scalability, safety, and verifiable domain execution.",
          notes: "Speaker Notes: Explain how planning and memory interact in real time.",
        },
        {
          number: 3,
          title: "Tool Execution & Real-World APIs",
          category: "INTEGRATION",
          bullets: [
            "Strict schema validation prevents invalid parameters and injection risks.",
            "Dynamic sandboxing isolates untrusted scripts and external operations.",
            "Full telemetry traces every tool call with latency and status codes.",
          ],
          takeaway: "Safe and audited tools unlock real-world productivity.",
          notes: "Speaker Notes: Emphasize security guardrails and zero-trust policies.",
        },
      ],
    },
  },

  // 4. Outlook Starter
  {
    id: "doc_outlook_inbox",
    name: "Workspace Mailbox & Team Calendar",
    description: "Inbox, scheduled events, client contacts, and automated AI email drafts.",
    app: "outlook",
    format: "eml",
    sizeBytes: 12000,
    isStarred: false,
    isPinned: false,
    isShared: false,
    isTrashed: false,
    tags: ["Email", "Schedule", "Communication"],
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      emails: [
        {
          id: "mail_1",
          folder: "inbox",
          subject: "Q4 Product Strategy & Workspace Rollout",
          from: { name: "Kotapati Gowtham Chowdary", email: "gowtham@tattva.ai" },
          to: [{ name: "Product Team", email: "team@tattva.ai" }],
          body: "Hello Team,\n\nThe full TATTVA AI My Workspace suite is now live. We have successfully launched all seven applications (Word, Excel, PowerPoint, Outlook, OneNote, Publisher, Access). Please review your department workbooks and confirm validation tests.\n\nBest regards,\nGowtham Chowdary",
          isRead: false,
          isStarred: true,
          timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
          status: "delivered",
        },
        {
          id: "mail_2",
          folder: "inbox",
          subject: "Database Schema Migration Approved",
          from: { name: "Security Auditor", email: "security@tattva.ai" },
          to: [{ name: "Engineering", email: "dev@tattva.ai" }],
          body: "The new PostgreSQL Row Level Security (RLS) policies for user data isolation have passed all automated vulnerability and authorization checks.",
          isRead: true,
          isStarred: false,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          status: "delivered",
        },
      ],
      events: [
        {
          id: "evt_1",
          title: "Sprint Planning & Workspace Review",
          description: "Review feature milestones for My Workspace 7-app productivity platform.",
          location: "TATTVA Conference Room A",
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
          isAllDay: false,
          recurring: "weekly",
          reminderMinutes: 15,
          attendees: ["gowtham@tattva.ai", "team@tattva.ai"],
          color: "#0078D4",
        },
      ],
      contacts: [
        {
          id: "cnt_1",
          name: "Kotapati Gowtham Chowdary",
          email: "gowtham@tattva.ai",
          phone: "+91 98765 43210",
          organization: "TATTVA AI",
          jobTitle: "Founder & Lead Architect",
          group: "Core Team",
          isFavorite: true,
        },
      ],
    },
  },

  // 5. OneNote Starter
  {
    id: "doc_onenote_field_notes",
    name: "Engineering Notebook & Research Diary",
    description: "Hierarchical sections, research summaries, checklist items, and handwriting notes.",
    app: "onenote",
    format: "one",
    sizeBytes: 15600,
    isStarred: true,
    isPinned: false,
    isShared: false,
    isTrashed: false,
    tags: ["Notebook", "Research", "Notes"],
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    content: {
      notebooks: [
        {
          id: "nb_1",
          title: "TATTVA AI Architecture",
          color: "#7719AA",
          sections: [
            {
              id: "sec_1",
              title: "System Principles",
              color: "#8B5CF6",
              pages: [
                {
                  id: "page_1",
                  title: "High-Performance Office File Standards",
                  updatedAt: new Date().toISOString(),
                  content: `<h3>Office Open XML & Binary File Compliance</h3>
<p>To guarantee external cross-compatibility across Microsoft 365, LibreOffice, and mobile viewers:</p>
<ul>
  <li>Always preserve standard OpenXML schemas and part relationships.</li>
  <li>Ensure [Content_Types].xml is the root entry in the zip container.</li>
  <li>Store speaker notes in explicit slide notes frames.</li>
</ul>`,
                  checklist: [
                    { id: "chk_1", text: "Validate DOCX with python-docx", done: true },
                    { id: "chk_2", text: "Validate XLSX with openpyxl", done: true },
                    { id: "chk_3", text: "Validate PPTX with ZipFile & python-pptx", done: true },
                    { id: "chk_4", text: "Test full 7-app dashboard integration", done: true },
                  ],
                  tags: ["Architecture", "Standards"],
                  isPinned: true,
                },
              ],
            },
          ],
        },
      ],
    },
  },

  // 6. Publisher Starter
  {
    id: "doc_publisher_summit_flyer",
    name: "AI Innovation Summit 2026 Flyer",
    description: "Print-ready page design with styled typography, event badges, and geometric accents.",
    app: "publisher",
    format: "pub",
    sizeBytes: 28900,
    isStarred: false,
    isPinned: false,
    isShared: false,
    isTrashed: false,
    tags: ["Design", "Poster", "Flyer"],
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    content: {
      title: "AI Innovation Summit 2026",
      templateType: "poster_a4",
      dimensions: { width: 800, height: 1130, unit: "px" },
      background: "#0A0F1D",
      elements: [
        {
          id: "pub_el_1",
          type: "badge",
          x: 10,
          y: 6,
          width: 28,
          height: 4,
          zIndex: 1,
          content: "GLOBAL TECH FORUM",
          fontSize: 11,
          fontWeight: "800",
          color: "#00E5FF",
          fill: "rgba(0, 229, 255, 0.15)",
          stroke: "#00E5FF",
          strokeWidth: 1,
          borderRadius: 20,
          align: "center",
        },
        {
          id: "pub_el_2",
          type: "heading",
          x: 10,
          y: 13,
          width: 80,
          height: 14,
          zIndex: 2,
          content: "AI INNOVATION SUMMIT 2026",
          fontSize: 32,
          fontWeight: "900",
          color: "#FFFFFF",
          align: "left",
        },
        {
          id: "pub_el_3",
          type: "text",
          x: 10,
          y: 28,
          width: 78,
          height: 8,
          zIndex: 3,
          content: "Join leading researchers and engineers to explore the frontiers of autonomous agent systems, neural compilers, and zero-trust computing.",
          fontSize: 14,
          color: "#94A3B8",
          align: "left",
        },
        {
          id: "pub_el_4",
          type: "shape",
          x: 10,
          y: 40,
          width: 80,
          height: 18,
          zIndex: 4,
          fill: "rgba(15, 23, 42, 0.8)",
          stroke: "#008272",
          strokeWidth: 2,
          borderRadius: 16,
          content: "Keynote: Kotapati Gowtham Chowdary • November 2026 • Live Streamed",
          color: "#E2E8F0",
          fontSize: 14,
          fontWeight: "700",
          align: "center",
        },
      ],
    },
  },

  // 7. Access Starter
  {
    id: "doc_access_operations_db",
    name: "Enterprise Operations & Asset Registry",
    description: "Relational database with Student/Asset tables, foreign keys, and visual queries.",
    app: "access",
    format: "accdb",
    sizeBytes: 31200,
    isStarred: true,
    isPinned: false,
    isShared: false,
    isTrashed: false,
    tags: ["Database", "SQL", "Relational"],
    version: 1,
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    content: {
      title: "Enterprise Operations Database",
      description: "Relational store for managing personnel, departments, and equipment assets.",
      tables: [
        {
          id: "tbl_departments",
          name: "departments",
          fields: [
            { name: "id", type: "NUMBER", isPrimary: true },
            { name: "name", type: "TEXT", isNullable: false },
            { name: "budget", type: "NUMBER" },
            { name: "lead", type: "TEXT" },
          ],
          records: [
            { id: 1, name: "Artificial Intelligence", budget: 450000, lead: "Gowtham Chowdary" },
            { id: 2, name: "Cloud Infrastructure", budget: 320000, lead: "Rajesh Varma" },
            { id: 3, name: "Product Design", budget: 180000, lead: "Elena Rostova" },
          ],
        },
        {
          id: "tbl_employees",
          name: "employees",
          fields: [
            { name: "id", type: "NUMBER", isPrimary: true },
            { name: "name", type: "TEXT", isNullable: false },
            { name: "role", type: "TEXT" },
            { name: "department_id", type: "RELATION", references: { table: "departments", field: "id" } },
            { name: "email", type: "TEXT" },
          ],
          records: [
            { id: 101, name: "Priya Sharma", role: "AI Research Scientist", department_id: 1, email: "priya@tattva.ai" },
            { id: 102, name: "David Miller", role: "DevOps Architect", department_id: 2, email: "david@tattva.ai" },
            { id: 103, name: "Aarav Patel", role: "UI/UX Specialist", department_id: 3, email: "aarav@tattva.ai" },
            { id: 104, name: "Ananya Iyer", role: "Backend Engineer", department_id: 1, email: "ananya@tattva.ai" },
          ],
        },
      ],
      relationships: [
        {
          id: "rel_1",
          fromTable: "departments",
          fromField: "id",
          toTable: "employees",
          toField: "department_id",
          type: "one_to_many",
        },
      ],
      savedQueries: [
        {
          id: "qry_1",
          name: "Active AI Researchers",
          sql: "SELECT e.name, e.role, d.name AS department FROM employees e JOIN departments d ON e.department_id = d.id WHERE d.name = 'Artificial Intelligence';",
          createdAt: new Date().toISOString(),
        },
      ],
    },
  },
];

/**
 * Loads all items from client storage or seeds starters
 */
export function loadWorkspaceItems(): WorkspaceItem[] {
  if (typeof window === "undefined") return STARTER_ITEMS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(STARTER_ITEMS));
      return STARTER_ITEMS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : STARTER_ITEMS;
  } catch (err) {
    console.warn("[Workspace Storage] LocalStorage read notice:", err);
    return STARTER_ITEMS;
  }
}

/**
 * Saves all items to local storage & notifies listeners
 */
export function persistWorkspaceItems(items: WorkspaceItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("tattva-workspace-changed", { detail: items }));
  } catch (err) {
    console.error("[Workspace Storage] Save error:", err);
  }
}

/**
 * Saves or updates a single workspace item
 */
export function saveWorkspaceItem(item: Partial<WorkspaceItem> & { name: string; app: WorkspaceAppId }): WorkspaceItem {
  const currentItems = loadWorkspaceItems();
  const now = new Date().toISOString();

  let updated: WorkspaceItem;

  if (item.id && currentItems.some((i) => i.id === item.id)) {
    // Update existing
    currentItems.forEach((existing, idx) => {
      if (existing.id === item.id) {
        updated = {
          ...existing,
          ...item,
          version: (existing.version || 1) + 1,
          updatedAt: now,
        };
        currentItems[idx] = updated;
      }
    });
  } else {
    // Create new
    const id = item.id || `doc_${item.app}_${Date.now()}`;
    updated = {
      id,
      name: item.name,
      description: item.description || `Created with TATTVA ${item.app.toUpperCase()}`,
      app: item.app,
      format: item.format || "json",
      content: item.content || {},
      sizeBytes: JSON.stringify(item.content || {}).length,
      isStarred: Boolean(item.isStarred),
      isPinned: Boolean(item.isPinned),
      isShared: Boolean(item.isShared),
      isTrashed: false,
      tags: item.tags || [item.app],
      version: 1,
      createdAt: now,
      updatedAt: now,
    };
    currentItems.unshift(updated);
  }

  persistWorkspaceItems(currentItems);

  // Background sync to backend API (client-side only)
  if (typeof window !== "undefined") {
    fetch("/api/workspace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", item: updated! }),
    }).catch((e) => console.warn("[Workspace Storage] Remote sync deferred:", e));
  }

  return updated!;
}

/**
 * Trash an item (soft delete)
 */
export function trashWorkspaceItem(id: string) {
  const current = loadWorkspaceItems();
  const next = current.map((i) => (i.id === id ? { ...i, isTrashed: true, trashedAt: new Date().toISOString() } : i));
  persistWorkspaceItems(next);
}

/**
 * Restore an item from trash
 */
export function restoreWorkspaceItem(id: string) {
  const current = loadWorkspaceItems();
  const next = current.map((i) => (i.id === id ? { ...i, isTrashed: false, trashedAt: undefined } : i));
  persistWorkspaceItems(next);
}

/**
 * Permanently delete an item
 */
export function permanentlyDeleteWorkspaceItem(id: string) {
  const current = loadWorkspaceItems();
  const next = current.filter((i) => i.id !== id);
  persistWorkspaceItems(next);
}

/**
 * Toggle Star
 */
export function toggleStarWorkspaceItem(id: string) {
  const current = loadWorkspaceItems();
  const next = current.map((i) => (i.id === id ? { ...i, isStarred: !i.isStarred } : i));
  persistWorkspaceItems(next);
}

/**
 * Toggle Pin
 */
export function togglePinWorkspaceItem(id: string) {
  const current = loadWorkspaceItems();
  const next = current.map((i) => (i.id === id ? { ...i, isPinned: !i.isPinned } : i));
  persistWorkspaceItems(next);
}

/**
 * High-level unified manager for all workspace persistence operations
 */
export const WorkspaceStorageManager = {
  getAllItems: (): WorkspaceItem[] => {
    return loadWorkspaceItems();
  },
  saveItem: (item: WorkspaceItem): WorkspaceItem => {
    return saveWorkspaceItem(item);
  },
  trashItem: (id: string) => {
    trashWorkspaceItem(id);
  },
  restoreItem: (id: string) => {
    restoreWorkspaceItem(id);
  },
  deleteItemPermanently: (id: string) => {
    permanentlyDeleteWorkspaceItem(id);
  },
  toggleStar: (id: string): WorkspaceItem | undefined => {
    toggleStarWorkspaceItem(id);
    return loadWorkspaceItems().find((i) => i.id === id);
  },
  togglePin: (id: string): WorkspaceItem | undefined => {
    togglePinWorkspaceItem(id);
    return loadWorkspaceItems().find((i) => i.id === id);
  },
  duplicateItem: (id: string): WorkspaceItem | undefined => {
    const items = loadWorkspaceItems();
    const source = items.find((i) => i.id === id);
    if (!source) return undefined;
    const copy: WorkspaceItem = {
      ...source,
      id: `doc_${source.app}_${Date.now()}`,
      name: `${source.name} (Copy)`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    saveWorkspaceItem(copy);
    return copy;
  },
  renameItem: (id: string, newName: string): WorkspaceItem | undefined => {
    const items = loadWorkspaceItems();
    const target = items.find((i) => i.id === id);
    if (!target) return undefined;
    const updated = { ...target, name: newName, updatedAt: new Date().toISOString() };
    saveWorkspaceItem(updated);
    return updated;
  },
  createBlankItem: (app: WorkspaceAppId, customName?: string): WorkspaceItem => {
    const id = `doc_${app}_${Date.now()}`;
    const name = customName || `Untitled ${app.charAt(0).toUpperCase() + app.slice(1)}`;
    let format = "docx";
    let content: any = {};

    if (app === "word") {
      format = "docx";
      content = {
        title: name,
        html: `<h1>${name}</h1><p>Start drafting your document here...</p>`,
      };
    } else if (app === "excel") {
      format = "xlsx";
      content = {
        sheets: [
          {
            id: "sheet_1",
            title: "Sheet1",
            rows: [
              ["Item", "Quantity", "Unit Price", "Total"],
              ["Service Alpha", 10, 150, 1500],
              ["Service Beta", 5, 200, 1000],
            ],
            formulas: { D2: "=B2*C2", D3: "=B3*C3" },
          },
        ],
        activeSheetIndex: 0,
      };
    } else if (app === "powerpoint") {
      format = "pptx";
      content = {
        title: name,
        theme: "modern_dark",
        slides: [
          {
            id: "s1",
            title: name,
            subtitle: "Presentation created in TATTVA AI Workspace",
            layout: "title",
            elements: [],
            bullets: ["Key objective 1", "Key objective 2", "Key objective 3"],
            notes: "Speaker notes for opening slide",
          },
        ],
      };
    } else if (app === "outlook") {
      format = "eml";
      content = {
        messages: [],
        events: [],
        contacts: [],
      };
    } else if (app === "onenote") {
      format = "one";
      content = {
        notebooks: [
          {
            id: `nb_${Date.now()}`,
            title: "My Notebook",
            color: "#7719AA",
            sections: [
              {
                id: `sec_${Date.now()}`,
                title: "Quick Notes",
                color: "#8B5CF6",
                pages: [
                  {
                    id: `pg_${Date.now()}`,
                    title: "Welcome Note",
                    content: "<p>Start capturing ideas, research, and notes here.</p>",
                    updatedAt: new Date().toISOString(),
                    checklist: [{ id: "c1", text: "Create first note", done: true }],
                  },
                ],
              },
            ],
          },
        ],
      };
    } else if (app === "publisher") {
      format = "pub";
      content = {
        title: name,
        templateType: "poster_a4",
        dimensions: { width: 800, height: 1130, unit: "px" },
        background: "#0F172A",
        elements: [
          {
            id: `el_head_${Date.now()}`,
            type: "heading",
            x: 10,
            y: 10,
            width: 80,
            height: 12,
            zIndex: 1,
            content: name,
            fontSize: 28,
            color: "#FFFFFF",
          },
        ],
      };
    } else if (app === "access") {
      format = "accdb";
      content = {
        id: `db_${Date.now()}`,
        title: name,
        tables: [
          {
            id: `tbl_${Date.now()}`,
            name: "records",
            fields: [
              { name: "id", type: "NUMBER", isPrimary: true },
              { name: "name", type: "TEXT" },
            ],
            records: [{ id: 1, name: "Sample Record 1" }],
          },
        ],
        relationships: [],
        savedQueries: [],
      };
    }

    const newItem: WorkspaceItem = {
      id,
      name,
      app,
      format,
      content,
      sizeBytes: 1024,
      isStarred: false,
      isPinned: false,
      isShared: false,
      isTrashed: false,
      tags: [app],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveWorkspaceItem(newItem);
    return newItem;
  },
};
