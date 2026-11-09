"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, Download, Sparkles, X } from "lucide-react";
import { WorkspaceItem, WorkspaceAppId } from "../components/workspace/types";
import { WORKSPACE_APPS, WORKSPACE_APPS_LIST } from "../components/workspace/constants";
import { WorkspaceStorageManager } from "../components/workspace/storage";
import { WorkspaceSidebar } from "../components/workspace/WorkspaceSidebar";
import { WorkspaceHeader } from "../components/workspace/WorkspaceHeader";
import { DashboardView } from "../components/workspace/DashboardView";
import { UnifiedFileManager } from "../components/workspace/file-manager/UnifiedFileManager";

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

  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [activeItem, setActiveItem] = useState<WorkspaceItem | null>(null);
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize data from WorkspaceStorageManager
  useEffect(() => {
    const loaded = WorkspaceStorageManager.getAllItems();
    setItems(loaded);
    setIsLoaded(true);

    // Check query params
    const qApp = searchParams.get("app");
    const qId = searchParams.get("id");

    if (qId) {
      const match = loaded.find((i) => i.id === qId);
      if (match) {
        setActiveItem(match);
        return;
      }
    }

    if (qApp && WORKSPACE_APPS_LIST.some((a) => a.id === qApp)) {
      setCurrentView(qApp);
    }
  }, [searchParams]);

  // Save Item
  const handleSaveItem = (updated: WorkspaceItem) => {
    WorkspaceStorageManager.saveItem(updated);
    setItems(WorkspaceStorageManager.getAllItems());
    setActiveItem(updated);
  };

  // Create New Item
  const handleNewItem = (appId?: WorkspaceAppId) => {
    const targetApp = appId || "word";
    const newItem = WorkspaceStorageManager.createBlankItem(targetApp);
    setItems(WorkspaceStorageManager.getAllItems());
    setActiveItem(newItem);
  };

  // Star Toggle
  const handleToggleStar = (id: string) => {
    const updated = WorkspaceStorageManager.toggleStar(id);
    if (updated) {
      setItems(WorkspaceStorageManager.getAllItems());
      if (activeItem?.id === id) setActiveItem(updated);
    }
  };

  // Pin Toggle
  const handleTogglePin = (id: string) => {
    const updated = WorkspaceStorageManager.togglePin(id);
    if (updated) {
      setItems(WorkspaceStorageManager.getAllItems());
      if (activeItem?.id === id) setActiveItem(updated);
    }
  };

  // Trash
  const handleTrashItem = (id: string) => {
    WorkspaceStorageManager.trashItem(id);
    setItems(WorkspaceStorageManager.getAllItems());
    if (activeItem?.id === id) setActiveItem(null);
  };

  // Restore
  const handleRestoreItem = (id: string) => {
    WorkspaceStorageManager.restoreItem(id);
    setItems(WorkspaceStorageManager.getAllItems());
  };

  // Delete Permanently
  const handleDeletePermanently = (id: string) => {
    WorkspaceStorageManager.deleteItemPermanently(id);
    setItems(WorkspaceStorageManager.getAllItems());
    if (activeItem?.id === id) setActiveItem(null);
  };

  // Duplicate
  const handleDuplicateItem = (id: string) => {
    const dup = WorkspaceStorageManager.duplicateItem(id);
    if (dup) {
      setItems(WorkspaceStorageManager.getAllItems());
      setActiveItem(dup);
    }
  };

  // Rename
  const handleRenameItem = (id: string, newName: string) => {
    const updated = WorkspaceStorageManager.renameItem(id, newName);
    if (updated) {
      setItems(WorkspaceStorageManager.getAllItems());
      if (activeItem?.id === id) setActiveItem(updated);
    }
  };

  // Export File via /api/workspace/export
  const handleExportItem = async (item: WorkspaceItem, specificFormat?: string) => {
    const targetFormat = specificFormat || item.format;
    try {
      const res = await fetch("/api/workspace/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app: item.app,
          format: targetFormat,
          name: item.name,
          content: item.content,
        }),
      });

      if (!res.ok) {
        throw new Error("Export server error");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.name.replace(/\.[^/.]+$/, "")}.${targetFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export fallback", err);
      // Client-side JSON fallback
      const fallbackBlob = new Blob([JSON.stringify(item.content, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(fallbackBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // File Import
  const handleImportFile = async (file: File) => {
    const name = file.name;
    const ext = name.split(".").pop()?.toLowerCase() || "docx";

    let app: WorkspaceAppId = "word";
    if (["xlsx", "xls", "csv"].includes(ext)) app = "excel";
    else if (["pptx", "ppt"].includes(ext)) app = "powerpoint";
    else if (["json", "accdb", "sql"].includes(ext)) app = "access";
    else if (["pub"].includes(ext)) app = "publisher";

    const newItem = WorkspaceStorageManager.createBlankItem(
      app,
      name.replace(/\.[^/.]+$/, "")
    );
    setItems(WorkspaceStorageManager.getAllItems());
    setActiveItem(newItem);
  };

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-wide">
            Loading My Workspace...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">
      {/* 1. Left Sidebar Navigation */}
      <WorkspaceSidebar
        currentView={activeItem ? activeItem.app : currentView}
        onSelectView={(view) => {
          setActiveItem(null);
          setCurrentView(view);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onNewFile={handleNewItem}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* If editing an active item, show the editor back-bar */}
        {activeItem ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Editor Top Bar */}
            <div className="h-10 bg-slate-800 text-slate-200 px-3 flex items-center justify-between border-b border-slate-700 select-none text-xs">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveItem(null)}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Workspace</span>
                </button>
                <div className="h-3 w-px bg-slate-600" />
                <span className="font-semibold text-white truncate max-w-xs md:max-w-md">
                  {activeItem.name}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-900 text-slate-400 rounded">
                  {activeItem.format}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportItem(activeItem)}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
                  title="Export File"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
                <button
                  onClick={() => setActiveItem(null)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                  title="Close document"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Active Application Canvas */}
            <div className="flex-1 overflow-hidden">
              {activeItem.app === "word" && (
                <WordEditor
                  item={activeItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => setActiveItem(null)}
                />
              )}
              {activeItem.app === "excel" && (
                <ExcelEditor
                  item={activeItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => setActiveItem(null)}
                />
              )}
              {activeItem.app === "powerpoint" && (
                <PowerPointApp
                  item={activeItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => setActiveItem(null)}
                />
              )}
              {activeItem.app === "outlook" && (
                <OutlookApp
                  item={activeItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => setActiveItem(null)}
                />
              )}
              {activeItem.app === "onenote" && (
                <OneNoteApp
                  item={activeItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => setActiveItem(null)}
                />
              )}
              {activeItem.app === "publisher" && (
                <PublisherStudio
                  item={activeItem as any}
                  onSave={handleSaveItem as any}
                  onBack={() => setActiveItem(null)}
                />
              )}
              {activeItem.app === "access" && (
                <AccessStudio
                  item={activeItem as any}
                  onSave={handleSaveItem as any}
                  onExport={(fmt: string) => handleExportItem(activeItem, fmt)}
                />
              )}
            </div>
          </div>
        ) : (
          /* Normal Workspace Navigation Views */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <WorkspaceHeader
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onImportFile={handleImportFile}
              onNewItem={handleNewItem}
            />

            {currentView === "dashboard" ? (
              <DashboardView
                items={items}
                onOpenItem={(it) => setActiveItem(it)}
                onNewItemForApp={(app) => handleNewItem(app)}
                onToggleStar={handleToggleStar}
                onTogglePin={handleTogglePin}
                onTrashItem={handleTrashItem}
                onExportItem={(it) => handleExportItem(it)}
                searchFilter={searchQuery}
              />
            ) : (
              <UnifiedFileManager
                items={items}
                filterMode={currentView as any}
                onOpenItem={(it) => setActiveItem(it)}
                onToggleStar={handleToggleStar}
                onTogglePin={handleTogglePin}
                onTrashItem={handleTrashItem}
                onRestoreItem={handleRestoreItem}
                onDeletePermanently={handleDeletePermanently}
                onDuplicateItem={handleDuplicateItem}
                onRenameItem={handleRenameItem}
                onExportItem={(it) => handleExportItem(it)}
                onNewItemForApp={(app) => handleNewItem(app)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <WorkspaceMainContent />
    </Suspense>
  );
}
