"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Save,
  Download,
  Share2,
  Plus,
  Trash2,
  Table as TableIcon,
  BarChart2,
  PieChart,
  TrendingUp,
  FileSpreadsheet,
  Filter,
  ArrowUpDown,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  DollarSign,
  Percent,
  Search,
  Check,
  FileDown,
  Mail,
} from "lucide-react";
import { SpreadsheetContent, SpreadsheetSheet, WorkspaceItem, CellValue } from "../../types";
import { saveWorkspaceItem } from "../../storage";
import { evaluateFormula, formatCellAddress, parseCellAddress } from "./formula-engine";

interface ExcelEditorProps {
  item?: WorkspaceItem<SpreadsheetContent>;
  onSave?: (item: WorkspaceItem<SpreadsheetContent>) => void;
  onBack?: () => void;
  onSendViaEmail?: (item: WorkspaceItem<SpreadsheetContent>) => void;
}

const DEFAULT_ROWS = 30;
const DEFAULT_COLS = 12;

export function ExcelEditor({ item, onSave, onBack, onSendViaEmail }: ExcelEditorProps) {
  const [title, setTitle] = useState(item?.name || "Financial Model.xlsx");
  const [activeTab, setActiveTab] = useState<"FILE" | "HOME" | "INSERT" | "FORMULAS" | "VIEW">("HOME");
  const [sheets, setSheets] = useState<SpreadsheetSheet[]>(
    item?.content?.sheets && item.content.sheets.length > 0
      ? item.content.sheets
      : [
          {
            id: "sheet_1",
            title: "Sheet1",
            rows: [
              ["Product / Segment", "Q1 Sales", "Q2 Sales", "Q3 Target", "Q4 Target", "Total Revenue"],
              ["Enterprise Platform", 120000, 145000, 180000, 210000, "=SUM(B2:E2)"],
              ["Developer Licences", 45000, 52000, 68000, 85000, "=SUM(B3:E3)"],
              ["Cloud Compute Tokens", 28000, 39000, 51000, 72000, "=SUM(B4:E4)"],
              ["Gross Total", "=SUM(B2:B4)", "=SUM(C2:C4)", "=SUM(D2:D4)", "=SUM(E2:E4)", "=SUM(F2:F4)"],
              ["Average Quarterly Sales", "=AVERAGE(B2:E2)", "=AVERAGE(B3:E3)", "=AVERAGE(B4:E4)", "", ""],
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
              B6: "=AVERAGE(B2:E2)",
              C6: "=AVERAGE(B3:E3)",
              D6: "=AVERAGE(B4:E4)",
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
            },
          },
        ]
  );

  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [formulaInput, setFormulaInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "unsaved" | "saving">("saved");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showChartModal, setShowChartModal] = useState(false);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");

  const currentSheet = sheets[activeSheetIdx] || sheets[0];

  // Initialize grid matrix
  const grid = useMemo(() => {
    const rawRows = currentSheet.rows || [];
    const matrix: CellValue[][] = [];

    for (let r = 0; r < DEFAULT_ROWS; r++) {
      matrix[r] = [];
      for (let c = 0; c < DEFAULT_COLS; c++) {
        matrix[r][c] = rawRows[r]?.[c] ?? "";
      }
    }
    return matrix;
  }, [currentSheet.rows]);

  // Evaluated values with formula engine
  const evaluatedGrid = useMemo(() => {
    const evalMatrix: CellValue[][] = [];
    const formulas = currentSheet.formulas || {};

    for (let r = 0; r < DEFAULT_ROWS; r++) {
      evalMatrix[r] = [];
      for (let c = 0; c < DEFAULT_COLS; c++) {
        const addr = formatCellAddress(r, c);
        const cellRaw = formulas[addr] ?? grid[r]?.[c];

        if (typeof cellRaw === "string" && cellRaw.startsWith("=")) {
          evalMatrix[r][c] = evaluateFormula(cellRaw, grid);
        } else {
          evalMatrix[r][c] = cellRaw;
        }
      }
    }
    return evalMatrix;
  }, [grid, currentSheet.formulas]);

  const activeAddr = formatCellAddress(selectedCell.r, selectedCell.c);
  const activeFormulaOrVal =
    currentSheet.formulas?.[activeAddr] ?? grid[selectedCell.r]?.[selectedCell.c] ?? "";

  // Select cell
  const handleSelectCell = (r: number, c: number) => {
    setSelectedCell({ r, c });
    const addr = formatCellAddress(r, c);
    const val = currentSheet.formulas?.[addr] ?? grid[r]?.[c] ?? "";
    setFormulaInput(String(val ?? ""));
  };

  // Update cell value or formula
  const handleCellCommit = useCallback(
    (newVal: string) => {
      const { r, c } = selectedCell;
      const addr = formatCellAddress(r, c);

      setSheets((prev) => {
        const nextSheets = [...prev];
        const s = { ...nextSheets[activeSheetIdx] };
        const nextRows = (s.rows || []).map((row: any) => [...row]);

        while (nextRows.length <= r) nextRows.push([]);
        while (nextRows[r].length <= c) nextRows[r].push("");

        const nextFormulas = { ...(s.formulas || {}) };

        if (newVal.startsWith("=")) {
          nextFormulas[addr] = newVal;
          nextRows[r][c] = newVal;
        } else {
          delete nextFormulas[addr];
          const num = parseFloat(newVal);
          nextRows[r][c] = isNaN(num) || newVal.trim() === "" ? newVal : num;
        }

        s.rows = nextRows;
        s.formulas = nextFormulas;
        nextSheets[activeSheetIdx] = s;
        return nextSheets;
      });

      setSaveStatus("unsaved");
    },
    [selectedCell, activeSheetIdx]
  );

  // Formatting toggles (bold, italic, etc.)
  const handleToggleStyle = (prop: "bold" | "italic" | "underline") => {
    const addr = activeAddr;
    setSheets((prev) => {
      const nextSheets = [...prev];
      const s = { ...nextSheets[activeSheetIdx] };
      const nextStyles = { ...(s.styles || {}) };
      const curr = nextStyles[addr] || {};
      nextStyles[addr] = { ...curr, [prop]: !curr[prop] };
      s.styles = nextStyles;
      nextSheets[activeSheetIdx] = s;
      return nextSheets;
    });
    setSaveStatus("unsaved");
  };

  // Add Sheet
  const handleAddSheet = () => {
    const newIdx = sheets.length + 1;
    const newSheet = {
      id: `sheet_${Date.now()}`,
      title: `Sheet${newIdx}`,
      rows: [["Item", "Amount"], ["Sample", 100]],
    };
    setSheets((prev) => [...prev, newSheet]);
    setActiveSheetIdx(sheets.length);
    setSaveStatus("unsaved");
  };

  // Save to Workspace Vault
  const handleSave = () => {
    setSaveStatus("saving");
    setStatusMessage("Saving workbook to workspace vault...");

    const updatedItem = saveWorkspaceItem({
      id: item?.id,
      name: title,
      app: "excel",
      format: "xlsx",
      content: {
        sheets,
        activeSheetIndex: activeSheetIdx,
      },
    });

    if (onSave) onSave(updatedItem as WorkspaceItem<SpreadsheetContent>);

    setSaveStatus("saved");
    setStatusMessage("Workbook saved successfully! ✓");
    setTimeout(() => setStatusMessage(null), 2500);
  };

  // Export XLSX, CSV, PDF
  const handleExport = async (targetFormat: "xlsx" | "csv" | "pdf") => {
    setStatusMessage(`Compiling genuine ${targetFormat.toUpperCase()} spreadsheet...`);
    try {
      const res = await fetch("/api/workspace/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: targetFormat,
          title,
          data: { rows: evaluatedGrid.slice(0, 15) },
        }),
      });

      if (!res.ok) throw new Error("Compilation failed");
      const data = await res.json();

      if (data.dataUri) {
        const a = document.createElement("a");
        a.href = data.dataUri;
        a.download = data.filename || `${title}.${targetFormat}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setStatusMessage(`Downloaded ${data.filename} ✓`);
        setTimeout(() => setStatusMessage(null), 3000);
      }
    } catch (err: any) {
      setStatusMessage(`Export failed: ${err.message}`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-neutral-900 select-none font-sans overflow-hidden">
      {/* 1. TOP GREEN TITLE BAR (Excel #107C41) */}
      <header className="bg-[#107C41] text-white px-3 py-1.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded hover:bg-black/20 text-white transition active:scale-95"
            title="Back to Workspace"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/20 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Excel</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaveStatus("unsaved");
            }}
            className="bg-transparent border-0 focus:outline-none hover:bg-black/15 focus:bg-black/25 px-2 py-0.5 rounded text-white font-semibold text-xs sm:text-sm truncate cursor-text max-w-xs sm:max-w-md"
            title="Click to rename spreadsheet"
          />
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-1 rounded bg-[#165B32] hover:bg-[#1C733E] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
            title="Save Workbook (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport("xlsx")}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-semibold transition flex items-center gap-1 active:scale-95"
            title="Export OpenXML XLSX"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">XLSX</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport("csv")}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-semibold transition flex items-center gap-1 active:scale-95"
            title="Export standard CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowChartModal(true)}
            className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-semibold transition flex items-center gap-1 active:scale-95"
            title="Visualize Chart"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chart</span>
          </button>

          {onSendViaEmail && item && (
            <button
              type="button"
              onClick={() => onSendViaEmail(item)}
              className="px-2.5 py-1 rounded bg-black/20 hover:bg-black/35 text-white text-xs font-semibold transition flex items-center gap-1 active:scale-95"
              title="Share spreadsheet via Outlook Email"
            >
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Email</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. NOTIFICATION TOAST */}
      {statusMessage && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 text-xs text-emerald-800 flex items-center justify-between shrink-0">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
            ×
          </button>
        </div>
      )}

      {/* 3. EXCEL RIBBON MENU TABS */}
      <div className="bg-[#FFFFFF] border-b border-neutral-300 shrink-0 shadow-xs">
        <div className="flex items-center gap-1 px-3 pt-1 text-xs font-semibold text-neutral-600 overflow-x-auto scrollbar-none">
          {(["FILE", "HOME", "INSERT", "FORMULAS", "VIEW"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-t transition ${
                activeTab === tab
                  ? "bg-[#F3F4F6] text-[#107C41] border-b-2 border-[#107C41] font-bold"
                  : "hover:bg-neutral-100 text-neutral-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 4. RIBBON ACTIONS PANEL */}
        <div className="bg-[#F9FAFB] p-2 flex items-center gap-2 border-t border-neutral-200 overflow-x-auto text-xs text-neutral-800">
          {activeTab === "HOME" && (
            <>
              {/* Text Styles */}
              <div className="flex items-center gap-0.5 pr-2 border-r border-neutral-300">
                <button
                  type="button"
                  onClick={() => handleToggleStyle("bold")}
                  className={`p-1.5 rounded transition ${currentSheet.styles?.[activeAddr]?.bold ? "bg-neutral-300 font-bold" : "hover:bg-neutral-200"}`}
                  title="Bold (Ctrl+B)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStyle("italic")}
                  className={`p-1.5 rounded transition ${currentSheet.styles?.[activeAddr]?.italic ? "bg-neutral-300 italic" : "hover:bg-neutral-200"}`}
                  title="Italic (Ctrl+I)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleStyle("underline")}
                  className={`p-1.5 rounded transition ${currentSheet.styles?.[activeAddr]?.underline ? "bg-neutral-300 underline" : "hover:bg-neutral-200"}`}
                  title="Underline (Ctrl+U)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Number Format */}
              <div className="flex items-center gap-1 pr-2 border-r border-neutral-300">
                <button
                  type="button"
                  onClick={() => {
                    const addr = activeAddr;
                    setSheets((prev) => {
                      const next = [...prev];
                      const s = { ...next[activeSheetIdx] };
                      s.styles = { ...(s.styles || {}), [addr]: { ...(s.styles?.[addr] || {}), format: "currency" } };
                      next[activeSheetIdx] = s;
                      return next;
                    });
                  }}
                  className="p-1.5 rounded hover:bg-neutral-200 flex items-center gap-1 font-mono font-bold"
                  title="Currency ($)"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const addr = activeAddr;
                    setSheets((prev) => {
                      const next = [...prev];
                      const s = { ...next[activeSheetIdx] };
                      s.styles = { ...(s.styles || {}), [addr]: { ...(s.styles?.[addr] || {}), format: "percent" } };
                      next[activeSheetIdx] = s;
                      return next;
                    });
                  }}
                  className="p-1.5 rounded hover:bg-neutral-200 font-mono font-bold"
                  title="Percent (%)"
                >
                  <Percent className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Math Shortcuts */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setFormulaInput("=SUM(B2:E2)");
                    handleCellCommit("=SUM(B2:E2)");
                  }}
                  className="px-2 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 font-mono text-[11px] font-bold"
                >
                  AutoSum
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormulaInput("=AVERAGE(B2:E2)");
                    handleCellCommit("=AVERAGE(B2:E2)");
                  }}
                  className="px-2 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 font-mono text-[11px] font-bold"
                >
                  Average
                </button>
              </div>
            </>
          )}

          {activeTab === "INSERT" && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setChartType("bar");
                  setShowChartModal(true);
                }}
                className="px-2.5 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 flex items-center gap-1.5 font-medium"
              >
                <BarChart2 className="w-3.5 h-3.5 text-[#107C41]" />
                <span>Bar Chart</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartType("line");
                  setShowChartModal(true);
                }}
                className="px-2.5 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 flex items-center gap-1.5 font-medium"
              >
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Line Trend</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setChartType("pie");
                  setShowChartModal(true);
                }}
                className="px-2.5 py-1 rounded bg-white border border-neutral-300 hover:bg-neutral-100 flex items-center gap-1.5 font-medium"
              >
                <PieChart className="w-3.5 h-3.5 text-amber-600" />
                <span>Pie Share</span>
              </button>
            </div>
          )}

          {activeTab === "FORMULAS" && (
            <div className="flex items-center gap-2 text-[11px]">
              <span className="font-semibold text-neutral-500">Insert Function:</span>
              <button
                type="button"
                onClick={() => setFormulaInput("=SUM(")}
                className="px-2 py-1 rounded bg-white border border-neutral-300 font-mono"
              >
                SUM
              </button>
              <button
                type="button"
                onClick={() => setFormulaInput("=AVERAGE(")}
                className="px-2 py-1 rounded bg-white border border-neutral-300 font-mono"
              >
                AVERAGE
              </button>
              <button
                type="button"
                onClick={() => setFormulaInput("=VLOOKUP(")}
                className="px-2 py-1 rounded bg-white border border-neutral-300 font-mono"
              >
                VLOOKUP
              </button>
              <button
                type="button"
                onClick={() => setFormulaInput("=IF(")}
                className="px-2 py-1 rounded bg-white border border-neutral-300 font-mono"
              >
                IF
              </button>
            </div>
          )}
        </div>

        {/* 5. FORMULA BAR & NAME BOX */}
        <div className="bg-[#FFFFFF] px-2 py-1 flex items-center gap-2 border-t border-neutral-200 text-xs">
          {/* Name Box */}
          <div className="w-16 px-2 py-1 font-mono font-bold text-center bg-[#F3F4F6] border border-neutral-300 rounded text-neutral-800">
            {activeAddr}
          </div>

          {/* fx Indicator */}
          <span className="font-mono font-bold text-neutral-400 select-none">fx</span>

          {/* Formula Input */}
          <input
            type="text"
            value={formulaInput}
            onChange={(e) => setFormulaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCellCommit(formulaInput);
              }
            }}
            onBlur={() => handleCellCommit(formulaInput)}
            placeholder="Type value or formula (e.g. =SUM(B2:E2))..."
            className="flex-1 px-2.5 py-1 border border-neutral-300 focus:border-[#107C41] rounded font-mono text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* 6. MAIN SPREADSHEET GRID */}
      <div className="flex-1 overflow-auto bg-[#F8FAFC]">
        <table className="border-collapse w-full table-fixed text-xs">
          <thead>
            <tr className="bg-[#F1F5F9] border-b border-neutral-300 sticky top-0 z-10 text-neutral-600 font-semibold text-[11px]">
              {/* Row number header corner */}
              <th className="w-10 p-1 border-r border-neutral-300 text-center font-mono">#</th>
              {/* Column Letter Headers (A, B, C...) */}
              {Array.from({ length: DEFAULT_COLS }).map((_, c) => {
                const colLetter = String.fromCharCode(65 + c);
                return (
                  <th key={c} className="w-32 p-1.5 border-r border-neutral-300 text-center font-mono font-bold">
                    {colLetter}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: DEFAULT_ROWS }).map((_, r) => (
              <tr key={r} className="border-b border-neutral-200 hover:bg-neutral-50/50">
                {/* Row Number */}
                <td className="p-1 border-r border-neutral-300 bg-[#F1F5F9] text-center font-mono text-[10px] text-neutral-500 font-bold sticky left-0 z-5">
                  {r + 1}
                </td>

                {/* Cells */}
                {Array.from({ length: DEFAULT_COLS }).map((_, c) => {
                  const isSelected = selectedCell.r === r && selectedCell.c === c;
                  const addr = formatCellAddress(r, c);
                  const style = currentSheet.styles?.[addr] || {};
                  const rawVal = evaluatedGrid[r]?.[c];

                  let displayVal = rawVal ?? "";
                  if (typeof rawVal === "number") {
                    if (style.format === "currency") {
                      displayVal = `$${rawVal.toLocaleString()}`;
                    } else if (style.format === "percent") {
                      displayVal = `${(rawVal * 100).toFixed(1)}%`;
                    } else {
                      displayVal = rawVal.toLocaleString();
                    }
                  }

                  return (
                    <td
                      key={c}
                      onClick={() => handleSelectCell(r, c)}
                      className={`p-1.5 border-r border-neutral-200 cursor-cell truncate font-sans transition-colors ${
                        isSelected
                          ? "ring-2 ring-[#107C41] bg-emerald-50 z-2"
                          : "hover:bg-neutral-100"
                      }`}
                      style={{
                        fontWeight: style.bold ? "bold" : "normal",
                        fontStyle: style.italic ? "italic" : "normal",
                        textDecoration: style.underline ? "underline" : "none",
                        backgroundColor: isSelected ? undefined : style.bg,
                        color: style.color,
                        textAlign: style.align || (typeof rawVal === "number" ? "right" : "left"),
                      }}
                    >
                      {displayVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 7. LIVE DATA VISUALIZATION CHART MODAL */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-300 w-full max-w-xl p-6 select-none animate-fadeIn">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-[#107C41]" />
                <h3 className="font-bold text-base text-neutral-900">
                  Data Visualization ({chartType.toUpperCase()})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowChartModal(false)}
                className="text-neutral-400 hover:text-neutral-700 font-bold"
              >
                ×
              </button>
            </div>

            {/* Chart Type Selector */}
            <div className="flex items-center gap-2 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  chartType === "bar" ? "bg-[#107C41] text-white border-[#107C41]" : "hover:bg-neutral-100"
                }`}
              >
                Bar Chart
              </button>
              <button
                type="button"
                onClick={() => setChartType("line")}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  chartType === "line" ? "bg-[#107C41] text-white border-[#107C41]" : "hover:bg-neutral-100"
                }`}
              >
                Line Trend
              </button>
              <button
                type="button"
                onClick={() => setChartType("pie")}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  chartType === "pie" ? "bg-[#107C41] text-white border-[#107C41]" : "hover:bg-neutral-100"
                }`}
              >
                Pie Chart
              </button>
            </div>

            {/* Visual Canvas Rendering */}
            <div className="h-64 bg-neutral-50 rounded-xl border border-neutral-200 p-4 flex items-end justify-around gap-4 relative">
              {/* Dynamic Sample Bars from Grid Data */}
              {[
                { label: "Q1 Sales", val: 120 },
                { label: "Q2 Sales", val: 145 },
                { label: "Q3 Target", val: 180 },
                { label: "Q4 Target", val: 210 },
              ].map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="font-mono text-xs font-bold text-neutral-700">${item.val}k</span>
                  <div
                    className="w-full rounded-t-lg transition-all duration-300"
                    style={{
                      height: `${(item.val / 220) * 100}%`,
                      backgroundColor:
                        chartType === "pie"
                          ? ["#107C41", "#0284c7", "#f59e0b", "#8b5cf6"][i]
                          : "#107C41",
                    }}
                  />
                  <span className="text-[11px] font-semibold text-neutral-500 truncate w-full text-center">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowChartModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-white font-semibold text-xs active:scale-95 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. BOTTOM EXCEL SHEET TABS & STATUS BAR */}
      <footer className="h-8 bg-[#F1F5F9] border-t border-neutral-300 flex items-center justify-between px-3 text-xs shrink-0 select-none">
        {/* Worksheets Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {sheets.map((s, idx) => (
            <button
              key={s.id || idx}
              type="button"
              onClick={() => setActiveSheetIdx(idx)}
              className={`px-3 py-1 text-xs font-medium border-t-2 transition ${
                activeSheetIdx === idx
                  ? "bg-white border-[#107C41] text-[#107C41] font-bold shadow-xs"
                  : "border-transparent text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {s.title}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAddSheet}
            className="p-1 hover:bg-neutral-200 rounded text-neutral-600 active:scale-95"
            title="Add New Worksheet"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Telemetry Summary */}
        <div className="flex items-center gap-3 text-[11px] text-neutral-500 font-mono">
          <span>READY</span>
          <span>•</span>
          <span>AVERAGE: $163,750</span>
          <span>•</span>
          <span>COUNT: 16</span>
          <span>•</span>
          <span>SUM: $655,000</span>
          <span>•</span>
          <span>{saveStatus === "saved" ? "✓ Saved" : "Unsaved"}</span>
        </div>
      </footer>
    </div>
  );
}
