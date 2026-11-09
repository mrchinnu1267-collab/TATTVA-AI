"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Sparkles,
  Plus,
  Users,
  Clock,
  FileText,
  Table,
  Presentation,
  Mail,
  BookOpen,
  Layout,
  Database,
  BarChart3,
  Zap,
  ArrowRight,
  Shield,
  Layers,
  Rocket,
  FolderOpen,
  Mic,
  Brain,
  Store,
  Target,
} from "lucide-react";
import { WorkspaceItem, WorkspaceAppId } from "../components/workspace/types";
import { WORKSPACE_APPS_LIST } from "../components/workspace/constants";
import { WorkspaceStorageManager } from "../components/workspace/storage";
import { WorkspaceSidebar } from "../components/workspace/WorkspaceSidebar";
import { UniversalAIAssistant } from "../components/workspace/UniversalAIAssistant";
import { WorkspaceAgentModal } from "../components/workspace/WorkspaceAgentModal";
import { CollaborationModal } from "../components/workspace/CollaborationModal";
import { DocumentIntelligenceModal } from "../components/workspace/DocumentIntelligenceModal";
import { UniversalSearchModal } from "../components/workspace/UniversalSearchModal";
import { WorkspaceInsightsModal } from "../components/workspace/WorkspaceInsightsModal";
import { SmartTemplatesModal } from "../components/workspace/SmartTemplatesModal";
import { AutomationCenterView } from "../components/workspace/AutomationCenterView";

// Advanced Ecosystem Views
import { AICommandCenterView } from "../components/workspace/AICommandCenterView";
import { SmartCanvasView } from "../components/workspace/SmartCanvasView";
import { ProjectManagerView } from "../components/workspace/ProjectManagerView";
import { ResearchLabView } from "../components/workspace/ResearchLabView";
import { SmartLearningView } from "../components/workspace/SmartLearningView";
import { KnowledgeGraphView } from "../components/workspace/KnowledgeGraphView";

// Advanced Feature Modals
import { FocusModeModal } from "../components/workspace/FocusModeModal";
import { VoiceWorkspaceModal } from "../components/workspace/VoiceWorkspaceModal";
import { WorkflowMarketplaceModal } from "../components/workspace/WorkflowMarketplaceModal";
import { ProjectMemoryModal } from "../components/workspace/ProjectMemoryModal";

// 7 Productivity Apps
import { WordEditor } from "../components/workspace/apps/word/WordEditor";
import { ExcelEditor } from "../components/workspace/apps/excel/ExcelEditor";
import { PowerPointApp } from "../components/workspace/apps/powerpoint/PowerPointApp";
import { OutlookApp } from "../components/workspace/apps/outlook/OutlookApp";
import { OneNoteApp } from "../components/workspace/apps/onenote/OneNoteApp";
import { PublisherStudio } from "../components/workspace/apps/publisher/PublisherStudio";
import { AccessStudio } from "../components/workspace/apps/access/AccessStudio";

function WorkspaceMainContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Storage & state
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [activeItem, setActiveItem] = useState<WorkspaceItem | null>(null);
  const [activeApp, setActiveApp] = useState<WorkspaceAppId>("powerpoint");
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Active Modals state
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(true);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [isDocIntelModalOpen, setIsDocIntelModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isInsightsModalOpen, setIsInsightsModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isMarketplaceModalOpen, setIsMarketplaceModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);

  // Initialize data
  useEffect(() => {
    const loaded = WorkspaceStorageManager.getAllItems();
    setItems(loaded);
    setIsLoaded(true);

    const qApp = searchParams.get("app") as WorkspaceAppId | null;
    const qId = searchParams.get("id");

    if (qId) {
      const match = loaded.find((i) => i.id === qId);
      if (match) {
        setActiveItem(match);
        setActiveApp(match.app);
        return;
      }
    }

    if (qApp && WORKSPACE_APPS_LIST.some((a) => a.id === qApp)) {
      setActiveApp(qApp);
    }
  }, [searchParams]);

  // Keyboard shortcut listener (Ctrl+K for Universal Search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSaveItem = (updated: WorkspaceItem) => {
    WorkspaceStorageManager.saveItem(updated);
    setItems(WorkspaceStorageManager.getAllItems());
    setActiveItem(updated);
  };

  const handleNewItem = (appId?: WorkspaceAppId) => {
    const targetApp = appId || activeApp || "word";
    const newItem = WorkspaceStorageManager.createBlankItem(targetApp);
    setItems(WorkspaceStorageManager.getAllItems());
    setActiveItem(newItem);
    setActiveApp(targetApp);
    setCurrentView("dashboard");
  };

  // Mock initial Agentic AI project review slides matching reference screenshot
  const initialProjectReviewItem: WorkspaceItem = {
    id: "item_agentic_ai_review",
    name: "Agentic AI - Project Review.pptx",
    description: "Executive architecture and project review presentation",
    app: "powerpoint",
    format: "pptx",
    sizeBytes: 1048576,
    isStarred: true,
    isPinned: true,
    isShared: true,
    isTrashed: false,
    tags: ["AgenticAI", "Architecture", "ProjectReview"],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      themeId: "dark_modern",
      slides: [
        {
          number: 1,
          title: "Agentic AI Project Review",
          category: "EXECUTIVE REVIEW",
          bullets: [
            "Architecture | Implementation | Results | Next Steps",
            "Autonomous multi-agent orchestration across production workflows.",
            "Sub-second verification feedback latency via client-side neural validation.",
          ],
          takeaway: "Enterprise-grade autonomy with verified domain compliance.",
          notes: "Speaker Notes: Welcome stakeholders and introduce the core mission.",
          elements: [
            {
              id: "el_proc_review",
              type: "process",
              x: 65,
              y: 20,
              w: 30,
              h: 60,
              processSteps: [
                { step: 1, title: "CAPTURE", color: "#EA580C" },
                { step: 2, title: "VERIFY", color: "#10B981" },
                { step: 3, title: "SYNC", color: "#00E5FF" },
                { step: 4, title: "ACT", color: "#FFFFFF" },
              ],
            },
          ],
        },
        {
          number: 2,
          title: "Agenda",
          category: "OVERVIEW",
          bullets: [
            "Project scope, key requirements, and strategic motivations.",
            "Cognitive multi-agent architecture and memory persistence.",
            "Live benchmark performance and production rollout timeline.",
          ],
          notes: "Speaker Notes: Walk through the meeting objectives.",
        },
        {
          number: 3,
          title: "System Architecture",
          category: "ARCHITECTURE",
          bullets: [
            "Hierarchical agent topology with specialized domain executors.",
            "Encrypted state stores with offline-first synchronization protocols.",
            "Strict input validation and Zero-Trust boundary controls.",
          ],
          notes: "Speaker Notes: Highlight offline synchronization and data safety.",
        },
        {
          number: 4,
          title: "Performance Analysis",
          category: "BENCHMARKS",
          bullets: [
            "99.4% task verification accuracy benchmarked across 12,000 runs.",
            "Average response latency of 420ms with context caching.",
            "Zero state collisions under concurrent multi-user collaboration.",
          ],
          notes: "Speaker Notes: Present the telemetry results and variance analysis.",
        },
        {
          number: 5,
          title: "Key Insights",
          category: "SYNTHESIS",
          bullets: [
            "Decoupled state management eliminates network failure bottlenecks.",
            "Natural language tool calling streamlines everyday productivity.",
            "Automated audit trails maintain regulatory standard compliance.",
          ],
          notes: "Speaker Notes: Emphasize practical business impact.",
        },
        {
          number: 6,
          title: "Conclusion & Next Steps",
          category: "ROADMAP",
          bullets: [
            "Full production deployment across enterprise team workspaces.",
            "Integration with universal search and background automation center.",
            "Continuous fine-tuning on domain-specific productivity tasks.",
          ],
          notes: "Speaker Notes: Summarize strategic deliverables and open for Q&A.",
        },
      ],
    },
  };

  const currentDisplayItem = activeItem || (activeApp === "powerpoint" ? initialProjectReviewItem : null);

  const getAppMeta = (id: WorkspaceAppId) => {
    switch (id) {
      case "word":
        return { name: "Word", sub: "Documents", letter: "W", bg: "bg-[#185ABD]", border: "border-blue-500" };
      case "excel":
        return { name: "Excel", sub: "Spreadsheets", letter: "X", bg: "bg-[#107C41]", border: "border-emerald-500" };
      case "powerpoint":
        return { name: "PowerPoint", sub: "Presentations", letter: "P", bg: "bg-[#C43E1C]", border: "border-orange-500" };
      case "outlook":
        return { name: "Outlook", sub: "Email & Calendar", letter: "O", bg: "bg-[#0078D4]", border: "border-sky-500" };
      case "onenote":
        return { name: "OneNote", sub: "Notes", letter: "N", bg: "bg-[#7719AA]", border: "border-purple-500" };
      case "publisher":
        return { name: "Publisher", sub: "Design & Print", letter: "P", bg: "bg-[#008272]", border: "border-teal-500" };
      case "access":
        return { name: "Access", sub: "Databases", letter: "A", bg: "bg-[#A4373A]", border: "border-rose-500" };
    }
  };

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0B0F19] text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wide">Loading TATTVA AI Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0F19] text-slate-200 select-none font-sans">
      {/* 1. Left Sidebar Navigation matching Reference Screenshot */}
      <WorkspaceSidebar
        currentView={currentView}
        onSelectView={(view) => {
          if (view === "focus_mode") {
            setIsFocusModalOpen(true);
            return;
          }
          setCurrentView(view);
          if (view !== "dashboard") setActiveItem(null);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onNewFile={() => handleNewItem(activeApp)}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0B0F19]">
        {/* Render View Depending on currentView state */}
        {currentView === "automation_center" ? (
          <AutomationCenterView />
        ) : currentView === "ai_command_center" ? (
          <AICommandCenterView
            items={items}
            onOpenApp={(app) => {
              setActiveApp(app);
              setCurrentView("dashboard");
            }}
          />
        ) : currentView === "projects" ? (
          <ProjectManagerView />
        ) : currentView === "canvas" ? (
          <SmartCanvasView />
        ) : currentView === "research" ? (
          <ResearchLabView />
        ) : currentView === "learning" ? (
          <SmartLearningView />
        ) : currentView === "knowledge_graph" ? (
          <KnowledgeGraphView />
        ) : (
          /* Normal Dashboard View matching Reference Screenshot */
          <div className="flex-1 flex flex-col h-full overflow-y-auto px-6 py-4 space-y-4">
            {/* 2A. Top Header Bar matching Screenshot */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                  <span>My Workspace</span>
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Your all-in-one, AI-powered productivity suite
                </p>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                {/* Search Bar matching screenshot */}
                <div
                  onClick={() => setIsSearchModalOpen(true)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 cursor-pointer w-full sm:w-80 shadow-xs transition"
                >
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="flex-1 truncate">Search files, apps, or ask TATTVA AI...</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700 rounded">
                    ⌘ K
                  </kbd>
                </div>

                {/* Notifications & User Profile matching screenshot */}
                <button
                  onClick={() => {}}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition shrink-0"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                </button>

                <div
                  className="w-8 h-8 rounded-full bg-[#107C41] flex items-center justify-center font-bold text-white text-xs shadow-sm shrink-0 cursor-pointer"
                  title="Kotapati Gowtham Chowdary (Verified Account)"
                >
                  MK
                </div>
              </div>
            </div>

            {/* 2B. Seven Applications Bar + Workspace Agent matching Screenshot */}
            <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 shrink-0 scrollbar-none">
              {WORKSPACE_APPS_LIST.map((app) => {
                const meta = getAppMeta(app.id);
                const isActive = activeApp === app.id;
                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      setActiveApp(app.id);
                      setActiveItem(null);
                    }}
                    className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left border transition shrink-0 ${
                      isActive
                        ? "bg-slate-800/90 border-indigo-500 shadow-md shadow-indigo-500/10 text-white"
                        : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center font-black text-white text-xs shadow-sm`}
                    >
                      {meta.letter}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white leading-tight">{meta.name}</div>
                      <div className="text-[10px] text-slate-400 leading-tight">{meta.sub}</div>
                    </div>
                  </button>
                );
              })}

              <button
                onClick={() => handleNewItem(activeApp)}
                className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-white transition shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add App</span>
              </button>

              {/* Glowing Purple TATTVA AI Workspace Agent Button matching Screenshot */}
              <button
                onClick={() => setIsAgentModalOpen(true)}
                className="ml-auto flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 border border-purple-400/40 transition shrink-0 animate-pulse"
              >
                <Sparkles className="w-4 h-4" />
                <span>TATTVA AI Workspace Agent</span>
              </button>
            </div>

            {/* 2C. Secondary Quick Feature Tabs matching Screenshot */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 shrink-0 text-xs scrollbar-none">
              <button
                onClick={() => {}}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500 text-indigo-300 font-semibold shadow-xs shrink-0"
              >
                <Rocket className="w-3.5 h-3.5 text-indigo-400" />
                <span>Advanced Features</span>
              </button>

              <button
                onClick={() => setIsCollabModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shrink-0"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Real-Time Collaboration</span>
              </button>

              <button
                onClick={() => setIsDocIntelModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shrink-0"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Version History</span>
              </button>

              <button
                onClick={() => setIsTemplatesModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shrink-0"
              >
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Smart Templates</span>
              </button>

              <button
                onClick={() => setIsDocIntelModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shrink-0"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Document Intelligence</span>
              </button>

              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shrink-0"
              >
                <Search className="w-3.5 h-3.5 text-orange-400" />
                <span>Universal Search</span>
              </button>

              <button
                onClick={() => setIsInsightsModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white transition shrink-0"
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Workspace Insights</span>
              </button>
            </div>

            {/* 2D. Main Central Application Viewport matching Screenshot */}
            <div className="relative rounded-2xl border border-slate-800/80 bg-[#141414] shadow-2xl overflow-hidden min-h-[500px] flex flex-col">
              {activeApp === "powerpoint" && (
                <PowerPointApp
                  item={currentDisplayItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => {}}
                />
              )}
              {activeApp === "word" && (
                <WordEditor
                  item={currentDisplayItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => {}}
                />
              )}
              {activeApp === "excel" && (
                <ExcelEditor
                  item={currentDisplayItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => {}}
                />
              )}
              {activeApp === "outlook" && (
                <OutlookApp
                  item={currentDisplayItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => {}}
                />
              )}
              {activeApp === "onenote" && (
                <OneNoteApp
                  item={currentDisplayItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => {}}
                />
              )}
              {activeApp === "publisher" && (
                <PublisherStudio
                  item={currentDisplayItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => {}}
                />
              )}
              {activeApp === "access" && (
                <AccessStudio
                  item={currentDisplayItem as any}
                  onSave={handleSaveItem as any}
                  onExport={() => {}}
                />
              )}
            </div>

            {/* 2E. Bottom Ecosystem Feature Cards matching Screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-2">
              {/* Card 1: AI Agent Automation */}
              <div
                onClick={() => setIsAgentModalOpen(true)}
                className="p-4 rounded-xl bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 mb-2">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-white group-hover:text-indigo-300 transition">
                    AI Agent Automation
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Automate multi-step tasks (e.g., report → analysis → presentation)
                  </p>
                </div>
              </div>

              {/* Card 2: Real-Time Collaboration */}
              <div
                onClick={() => setIsCollabModalOpen(true)}
                className="p-4 rounded-xl bg-slate-900/60 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-2">
                    <Users className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-white group-hover:text-blue-300 transition">
                    Real-Time Collaboration
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Edit together, comment, and track changes live
                  </p>
                </div>
              </div>

              {/* Card 3: Document Intelligence */}
              <div
                onClick={() => setIsDocIntelModalOpen(true)}
                className="p-4 rounded-xl bg-slate-900/60 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-white group-hover:text-emerald-300 transition">
                    Document Intelligence
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Summarize, extract, compare, OCR, and analyze documents
                  </p>
                </div>
              </div>

              {/* Card 4: Universal Search */}
              <div
                onClick={() => setIsSearchModalOpen(true)}
                className="p-4 rounded-xl bg-slate-900/60 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-2">
                    <Search className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-white group-hover:text-amber-300 transition">
                    Universal Search
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Find anything across all workspace apps and files
                  </p>
                </div>
              </div>

              {/* Card 5: Workspace Insights */}
              <div
                onClick={() => setIsInsightsModalOpen(true)}
                className="p-4 rounded-xl bg-slate-900/60 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-2">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-white group-hover:text-cyan-300 transition">
                    Workspace Insights
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Usage, activity, AI operations and productivity analytics
                  </p>
                </div>
              </div>

              {/* Card 6: Smart Templates */}
              <div
                onClick={() => setIsTemplatesModalOpen(true)}
                className="p-4 rounded-xl bg-slate-900/60 hover:bg-pink-950/40 border border-slate-800 hover:border-pink-500/50 cursor-pointer transition flex flex-col justify-between group"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-pink-600/30 border border-pink-500/40 flex items-center justify-center text-pink-400 mb-2">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-white group-hover:text-pink-300 transition">
                    Smart Templates
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    Professional, ready-to-use templates for every need
                  </p>
                </div>
              </div>
            </div>

            {/* 2F. Additional Advanced Features matching Reference Images */}
            <div className="pt-2">
              <div className="flex items-center space-x-2 mb-2 text-xs font-semibold text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Additional Advanced Features</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
                <button
                  onClick={() => setIsVoiceModalOpen(true)}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-center transition flex flex-col items-center justify-center space-y-1"
                >
                  <Mic className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white text-[11px]">Voice Workspace</span>
                  <span className="text-[9px] text-slate-500">Dictation & Commands</span>
                </button>

                <button
                  onClick={() => setIsFocusModalOpen(true)}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-center transition flex flex-col items-center justify-center space-y-1"
                >
                  <Target className="w-4 h-4 text-rose-400" />
                  <span className="font-semibold text-white text-[11px]">Focus Mode</span>
                  <span className="text-[9px] text-slate-500">Deep Work Timer</span>
                </button>

                <button
                  onClick={() => setIsDocIntelModalOpen(true)}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-center transition flex flex-col items-center justify-center space-y-1"
                >
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-white text-[11px]">Version History</span>
                  <span className="text-[9px] text-slate-500">Track & Restore</span>
                </button>

                <button
                  onClick={() => setIsMarketplaceModalOpen(true)}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-center transition flex flex-col items-center justify-center space-y-1"
                >
                  <Store className="w-4 h-4 text-orange-400" />
                  <span className="font-semibold text-white text-[11px]">Workflow Market</span>
                  <span className="text-[9px] text-slate-500">Automation Hub</span>
                </button>

                <button
                  onClick={() => setIsMemoryModalOpen(true)}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-center transition flex flex-col items-center justify-center space-y-1"
                >
                  <Brain className="w-4 h-4 text-pink-400" />
                  <span className="font-semibold text-white text-[11px]">Project Memory</span>
                  <span className="text-[9px] text-slate-500">Persistent Context</span>
                </button>

                <button
                  onClick={() => setCurrentView("projects")}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-center transition flex flex-col items-center justify-center space-y-1"
                >
                  <Layout className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-white text-[11px]">Project Board</span>
                  <span className="text-[9px] text-slate-500">Kanban & Timeline</span>
                </button>

                <button
                  onClick={() => setCurrentView("canvas")}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-center transition flex flex-col items-center justify-center space-y-1"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-semibold text-white text-[11px]">Smart Canvas</span>
                  <span className="text-[9px] text-slate-500">Visual Mindmap</span>
                </button>

                <button
                  onClick={() => setCurrentView("research")}
                  className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-center transition flex flex-col items-center justify-center space-y-1"
                >
                  <BookOpen className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-white text-[11px]">Research Lab</span>
                  <span className="text-[9px] text-slate-500">Sources & Citations</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. Docked Right Universal AI Workspace Assistant matching Screenshot */}
        <UniversalAIAssistant
          isOpen={isAIAssistantOpen}
          onClose={() => setIsAIAssistantOpen(false)}
          activeApp={activeApp}
          activeDocument={currentDisplayItem}
          workspaceFiles={items}
          onExecuteAction={(type, payload) => {
            console.log("AI Action Executed:", type, payload);
          }}
        />

        {/* 4. Ecosystem Feature Modals */}
        <WorkspaceAgentModal
          isOpen={isAgentModalOpen}
          onClose={() => setIsAgentModalOpen(false)}
          onTaskCompleted={(newItem) => {
            setIsAgentModalOpen(false);
          }}
        />

        <CollaborationModal
          isOpen={isCollabModalOpen}
          onClose={() => setIsCollabModalOpen(false)}
          documentTitle={currentDisplayItem?.name}
        />

        <DocumentIntelligenceModal
          isOpen={isDocIntelModalOpen}
          onClose={() => setIsDocIntelModalOpen(false)}
          activeItem={currentDisplayItem}
          workspaceFiles={items}
        />

        <UniversalSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          items={items}
          onOpenItem={(it) => {
            setActiveItem(it);
            setActiveApp(it.app);
            setCurrentView("dashboard");
          }}
        />

        <WorkspaceInsightsModal
          isOpen={isInsightsModalOpen}
          onClose={() => setIsInsightsModalOpen(false)}
          items={items}
        />

        <SmartTemplatesModal
          isOpen={isTemplatesModalOpen}
          onClose={() => setIsTemplatesModalOpen(false)}
          onSelectTemplate={(app, title) => {
            setActiveApp(app);
            handleNewItem(app);
          }}
        />

        <FocusModeModal
          isOpen={isFocusModalOpen}
          onClose={() => setIsFocusModalOpen(false)}
        />

        <VoiceWorkspaceModal
          isOpen={isVoiceModalOpen}
          onClose={() => setIsVoiceModalOpen(false)}
          onExecuteVoiceCommand={(cmd) => {
            console.log("Voice Command:", cmd);
          }}
        />

        <WorkflowMarketplaceModal
          isOpen={isMarketplaceModalOpen}
          onClose={() => setIsMarketplaceModalOpen(false)}
          onRunWorkflow={(wf) => {
            console.log("Run Workflow:", wf);
          }}
        />

        <ProjectMemoryModal
          isOpen={isMemoryModalOpen}
          onClose={() => setIsMemoryModalOpen(false)}
        />
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-[#0B0F19] text-white">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WorkspaceMainContent />
    </Suspense>
  );
}
