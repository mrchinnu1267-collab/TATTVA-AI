"use client";

import React, { useState, useMemo } from "react";
import {
  Database,
  Table as TableIcon,
  Columns,
  GitFork,
  Terminal,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Key,
  Play,
  Save,
  Download,
  Upload,
  Search,
  Filter,
  ArrowRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import {
  AccessDatabase,
  AccessTable,
  AccessField,
  AccessDataType,
  AccessRelationship,
  AccessQuery,
  WorkspaceItem,
} from "../../types";

interface AccessStudioProps {
  item: WorkspaceItem<AccessDatabase>;
  onSave?: (updatedItem: WorkspaceItem<AccessDatabase>) => void;
  onExport?: (format: string) => void;
}

type AccessViewMode = "datasheet" | "design" | "relationships" | "sql" | "form" | "report";

export const AccessStudio: React.FC<AccessStudioProps> = ({
  item,
  onSave,
  onExport,
}) => {
  const [database, setDatabase] = useState<AccessDatabase>(() => {
    return (
      item.content || {
        id: "db_new",
        title: item.name || "Untitled Database",
        tables: [],
        relationships: [],
        savedQueries: [],
      }
    );
  });

  const [activeTableId, setActiveTableId] = useState<string>(
    () => database.tables[0]?.id || ""
  );
  const [viewMode, setViewMode] = useState<AccessViewMode>("datasheet");
  const [searchTerm, setSearchTerm] = useState("");
  const [sqlQuery, setSqlQuery] = useState<string>(
    database.savedQueries[0]?.sql || "SELECT * FROM departments;"
  );
  const [sqlResult, setSqlResult] = useState<{
    columns: string[];
    rows: any[];
    error?: string;
    executionTimeMs?: number;
  } | null>(null);

  // Form View state
  const [formRecordIndex, setFormRecordIndex] = useState(0);

  // Active table
  const activeTable = useMemo(() => {
    return database.tables.find((t) => t.id === activeTableId) || database.tables[0];
  }, [database.tables, activeTableId]);

  // Update helper
  const updateDatabase = (newDb: AccessDatabase) => {
    setDatabase(newDb);
    if (onSave) {
      onSave({
        ...item,
        content: newDb,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Add Table
  const handleAddTable = () => {
    const tableName = `table_${database.tables.length + 1}`;
    const newTable: AccessTable = {
      id: `tbl_${Date.now()}`,
      name: tableName,
      fields: [
        { name: "id", type: "NUMBER", isPrimary: true },
        { name: "name", type: "TEXT", isNullable: false },
        { name: "created_at", type: "DATE" },
      ],
      records: [
        { id: 1, name: "Sample Item 1", created_at: new Date().toISOString().slice(0, 10) },
      ],
    };
    const updated = {
      ...database,
      tables: [...database.tables, newTable],
    };
    updateDatabase(updated);
    setActiveTableId(newTable.id);
  };

  // Delete Table
  const handleDeleteTable = (tableId: string) => {
    if (database.tables.length <= 1) {
      alert("Database must retain at least one table.");
      return;
    }
    const updatedTables = database.tables.filter((t) => t.id !== tableId);
    const updatedRels = database.relationships.filter(
      (r) => r.fromTable !== tableId && r.toTable !== tableId
    );
    const updated = {
      ...database,
      tables: updatedTables,
      relationships: updatedRels,
    };
    updateDatabase(updated);
    if (activeTableId === tableId) {
      setActiveTableId(updatedTables[0]?.id || "");
    }
  };

  // Add Column / Field
  const handleAddField = () => {
    if (!activeTable) return;
    const fieldName = `field_${activeTable.fields.length + 1}`;
    const newField: AccessField = {
      name: fieldName,
      type: "TEXT",
      isNullable: true,
    };
    const updatedTable: AccessTable = {
      ...activeTable,
      fields: [...activeTable.fields, newField],
      records: activeTable.records.map((r) => ({ ...r, [fieldName]: "" })),
    };
    const updated = {
      ...database,
      tables: database.tables.map((t) => (t.id === activeTable.id ? updatedTable : t)),
    };
    updateDatabase(updated);
  };

  // Update Field Schema
  const handleUpdateField = (index: number, patch: Partial<AccessField>) => {
    if (!activeTable) return;
    const oldField = activeTable.fields[index];
    const newField = { ...oldField, ...patch };
    const updatedFields = [...activeTable.fields];
    updatedFields[index] = newField;

    let updatedRecords = activeTable.records;
    if (patch.name && patch.name !== oldField.name) {
      updatedRecords = activeTable.records.map((r) => {
        const copy = { ...r };
        copy[patch.name!] = copy[oldField.name];
        delete copy[oldField.name];
        return copy;
      });
    }

    const updatedTable: AccessTable = {
      ...activeTable,
      fields: updatedFields,
      records: updatedRecords,
    };
    const updated = {
      ...database,
      tables: database.tables.map((t) => (t.id === activeTable.id ? updatedTable : t)),
    };
    updateDatabase(updated);
  };

  // Delete Field
  const handleDeleteField = (index: number) => {
    if (!activeTable || activeTable.fields.length <= 1) return;
    const fieldToDelete = activeTable.fields[index];
    const updatedFields = activeTable.fields.filter((_, i) => i !== index);
    const updatedRecords = activeTable.records.map((r) => {
      const copy = { ...r };
      delete copy[fieldToDelete.name];
      return copy;
    });

    const updatedTable: AccessTable = {
      ...activeTable,
      fields: updatedFields,
      records: updatedRecords,
    };
    const updated = {
      ...database,
      tables: database.tables.map((t) => (t.id === activeTable.id ? updatedTable : t)),
    };
    updateDatabase(updated);
  };

  // Add Record Row
  const handleAddRecord = () => {
    if (!activeTable) return;
    const newRecord: Record<string, any> = {};
    activeTable.fields.forEach((f) => {
      if (f.isPrimary && f.type === "NUMBER") {
        const maxVal = activeTable.records.reduce(
          (max, r) => (typeof r[f.name] === "number" && r[f.name] > max ? r[f.name] : max),
          0
        );
        newRecord[f.name] = maxVal + 1;
      } else if (f.type === "BOOLEAN") {
        newRecord[f.name] = false;
      } else if (f.type === "DATE") {
        newRecord[f.name] = new Date().toISOString().slice(0, 10);
      } else {
        newRecord[f.name] = "";
      }
    });

    const updatedTable: AccessTable = {
      ...activeTable,
      records: [...activeTable.records, newRecord],
    };
    const updated = {
      ...database,
      tables: database.tables.map((t) => (t.id === activeTable.id ? updatedTable : t)),
    };
    updateDatabase(updated);
    setFormRecordIndex(updatedTable.records.length - 1);
  };

  // Update Cell Value
  const handleUpdateCell = (rowIndex: number, fieldName: string, value: any) => {
    if (!activeTable) return;
    const updatedRecords = [...activeTable.records];
    updatedRecords[rowIndex] = {
      ...updatedRecords[rowIndex],
      [fieldName]: value,
    };
    const updatedTable: AccessTable = {
      ...activeTable,
      records: updatedRecords,
    };
    const updated = {
      ...database,
      tables: database.tables.map((t) => (t.id === activeTable.id ? updatedTable : t)),
    };
    updateDatabase(updated);
  };

  // Delete Record Row
  const handleDeleteRecord = (rowIndex: number) => {
    if (!activeTable) return;
    const updatedRecords = activeTable.records.filter((_, i) => i !== rowIndex);
    const updatedTable: AccessTable = {
      ...activeTable,
      records: updatedRecords,
    };
    const updated = {
      ...database,
      tables: database.tables.map((t) => (t.id === activeTable.id ? updatedTable : t)),
    };
    updateDatabase(updated);
    if (formRecordIndex >= updatedRecords.length) {
      setFormRecordIndex(Math.max(0, updatedRecords.length - 1));
    }
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    if (!activeTable) return [];
    if (!searchTerm.trim()) return activeTable.records;
    const q = searchTerm.toLowerCase();
    return activeTable.records.filter((rec) =>
      Object.values(rec).some((val) => String(val ?? "").toLowerCase().includes(q))
    );
  }, [activeTable, searchTerm]);

  // Execute Safe SQL In-Memory
  const handleExecuteSql = () => {
    const startTime = performance.now();
    try {
      const clean = sqlQuery.trim().replace(/;$/, "");
      const matchSelect = clean.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(.*)/i);

      if (!matchSelect) {
        setSqlResult({
          columns: [],
          rows: [],
          error: "Syntax error: Only SELECT queries are currently supported in safe mode.",
        });
        return;
      }

      const selectClause = matchSelect[1].trim();
      const tableName = matchSelect[2].trim();
      const rest = matchSelect[3].trim();

      const table = database.tables.find(
        (t) => t.name.toLowerCase() === tableName.toLowerCase()
      );

      if (!table) {
        setSqlResult({
          columns: [],
          rows: [],
          error: `Table '${tableName}' not found in database schema.`,
        });
        return;
      }

      let rows = [...table.records];

      // Simple WHERE filter if present
      const whereMatch = rest.match(/WHERE\s+([a-zA-Z0-9_]+)\s*(=|!=|>|<)\s*['"]?([^'"]+)['"]?/i);
      if (whereMatch) {
        const field = whereMatch[1];
        const op = whereMatch[2];
        const val = whereMatch[3];

        rows = rows.filter((r) => {
          const cellVal = String(r[field] ?? "");
          if (op === "=") return cellVal.toLowerCase() === val.toLowerCase();
          if (op === "!=") return cellVal.toLowerCase() !== val.toLowerCase();
          if (op === ">") return Number(cellVal) > Number(val);
          if (op === "<") return Number(cellVal) < Number(val);
          return true;
        });
      }

      // Column selection
      let columns: string[] = [];
      let mappedRows: any[] = [];

      if (selectClause === "*") {
        columns = table.fields.map((f) => f.name);
        mappedRows = rows;
      } else {
        const requestedCols = selectClause.split(",").map((c) => c.trim().split(" AS ").pop()!.trim());
        columns = requestedCols;
        mappedRows = rows.map((r) => {
          const rowObj: any = {};
          columns.forEach((col) => {
            rowObj[col] = r[col] ?? null;
          });
          return rowObj;
        });
      }

      const elapsed = Math.round(performance.now() - startTime);
      setSqlResult({
        columns,
        rows: mappedRows,
        executionTimeMs: elapsed,
      });
    } catch (err: any) {
      setSqlResult({
        columns: [],
        rows: [],
        error: err.message || "Failed to execute query",
      });
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!activeTable) return;
    const headers = activeTable.fields.map((f) => f.name).join(",");
    const rows = activeTable.records.map((r) =>
      activeTable.fields.map((f) => JSON.stringify(r[f.name] ?? "")).join(",")
    );
    const csvContent = [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTable.name}_export.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export JSON Schema & Data
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(database, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${database.title.toLowerCase().replace(/\s+/g, "_")}.accdb.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 select-none">
      {/* 1. Header Toolbar */}
      <header className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-[#A4373A] to-[#802427] text-white shadow-sm border-b border-rose-900">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-lg text-white shadow-inner">
            A
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-semibold text-sm tracking-wide">
                {database.title}
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20 font-mono">
                Access Studio
              </span>
            </div>
            <p className="text-[11px] text-rose-100/80">
              {database.tables.length} tables •{" "}
              {database.relationships.length} relationships • Relational DB
            </p>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-black/20 p-1 rounded-lg space-x-1 text-xs">
          <button
            onClick={() => setViewMode("datasheet")}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-all ${
              viewMode === "datasheet"
                ? "bg-white text-rose-900 font-semibold shadow-sm"
                : "text-rose-100 hover:bg-white/10"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Datasheet</span>
          </button>
          <button
            onClick={() => setViewMode("design")}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-all ${
              viewMode === "design"
                ? "bg-white text-rose-900 font-semibold shadow-sm"
                : "text-rose-100 hover:bg-white/10"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Design View</span>
          </button>
          <button
            onClick={() => setViewMode("relationships")}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-all ${
              viewMode === "relationships"
                ? "bg-white text-rose-900 font-semibold shadow-sm"
                : "text-rose-100 hover:bg-white/10"
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Relationships</span>
          </button>
          <button
            onClick={() => setViewMode("sql")}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-all ${
              viewMode === "sql"
                ? "bg-white text-rose-900 font-semibold shadow-sm"
                : "text-rose-100 hover:bg-white/10"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>SQL Query</span>
          </button>
          <button
            onClick={() => setViewMode("form")}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-all ${
              viewMode === "form"
                ? "bg-white text-rose-900 font-semibold shadow-sm"
                : "text-rose-100 hover:bg-white/10"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Form</span>
          </button>
          <button
            onClick={() => setViewMode("report")}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded transition-all ${
              viewMode === "report"
                ? "bg-white text-rose-900 font-semibold shadow-sm"
                : "text-rose-100 hover:bg-white/10"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Report</span>
          </button>
        </div>

        {/* Global Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            title="Export Active Table to CSV"
            className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-rose-100 hover:text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            title="Export Full Database Schema & Data"
            className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-rose-100 hover:text-white transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
          <button
            onClick={() => onSave && onSave(item)}
            className="flex items-center space-x-1 px-3 py-1 text-xs bg-white text-rose-900 font-semibold hover:bg-rose-50 rounded shadow-sm transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </header>

      {/* 2. Main Studio Body with Left Navigation Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left All Access Objects Pane */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Database Objects
            </span>
            <button
              onClick={handleAddTable}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 transition"
              title="Add New Table"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Tables Section */}
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <TableIcon className="w-3.5 h-3.5 text-rose-700" />
                  <span>Tables ({database.tables.length})</span>
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {database.tables.map((tbl) => (
                  <div
                    key={tbl.id}
                    onClick={() => setActiveTableId(tbl.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition ${
                      activeTable?.id === tbl.id
                        ? "bg-rose-50 text-rose-900 font-semibold border-l-2 border-rose-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span className="truncate">{tbl.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {tbl.records.length} rows
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Queries Section */}
            <div>
              <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-600">
                <span className="flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Saved Queries ({database.savedQueries.length})</span>
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {database.savedQueries.map((qry) => (
                  <div
                    key={qry.id}
                    onClick={() => {
                      setSqlQuery(qry.sql);
                      setViewMode("sql");
                    }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer text-slate-700 hover:bg-slate-100 transition"
                  >
                    <span className="truncate">{qry.name}</span>
                    <Play className="w-3 h-3 text-slate-400 hover:text-indigo-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500">
            Active: <strong className="text-slate-700">{activeTable?.name}</strong>
          </div>
        </aside>

        {/* Right Workspace Content Canvas */}
        <main className="flex-1 flex flex-col bg-slate-100 overflow-hidden">
          {/* VIEW 1: DATASHEET (GRID) */}
          {viewMode === "datasheet" && activeTable && (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Table Action Bar */}
              <div className="p-2 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAddRecord}
                    className="flex items-center space-x-1 px-3 py-1 bg-rose-700 text-white rounded text-xs font-medium hover:bg-rose-800 shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Row</span>
                  </button>
                  <button
                    onClick={handleAddField}
                    className="flex items-center space-x-1 px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-700 font-medium hover:bg-slate-50 shadow-sm transition"
                  >
                    <Columns className="w-3.5 h-3.5 text-slate-500" />
                    <span>Add Column</span>
                  </button>
                  <div className="h-4 w-px bg-slate-300 mx-1" />
                  <span className="text-xs text-slate-500">
                    {filteredRecords.length} records
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Data Grid Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-300 z-10 shadow-sm">
                    <tr>
                      <th className="w-12 py-2 px-2 border-r border-slate-300 text-slate-500 text-center font-semibold">
                        #
                      </th>
                      {activeTable.fields.map((field) => (
                        <th
                          key={field.name}
                          className="py-2 px-3 border-r border-slate-300 text-left font-semibold text-slate-700"
                        >
                          <div className="flex items-center space-x-1.5">
                            {field.isPrimary && (
                              <Key className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                            <span className="truncate">{field.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              ({field.type.toLowerCase()})
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="w-12 py-2 px-2 text-center text-slate-400 font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="border-b border-slate-200 hover:bg-rose-50/40 transition"
                      >
                        <td className="py-1 px-2 border-r border-slate-200 text-center text-slate-400 font-mono text-[11px] bg-slate-50/60">
                          {rIdx + 1}
                        </td>
                        {activeTable.fields.map((field) => (
                          <td
                            key={field.name}
                            className="py-1 px-2 border-r border-slate-200 text-slate-800"
                          >
                            <input
                              type={field.type === "NUMBER" ? "number" : "text"}
                              value={row[field.name] ?? ""}
                              onChange={(e) =>
                                handleUpdateCell(
                                  rIdx,
                                  field.name,
                                  field.type === "NUMBER"
                                    ? Number(e.target.value)
                                    : e.target.value
                                )
                              }
                              className="w-full bg-transparent px-1 py-0.5 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 text-xs"
                            />
                          </td>
                        ))}
                        <td className="py-1 px-2 text-center">
                          <button
                            onClick={() => handleDeleteRecord(rIdx)}
                            className="text-slate-400 hover:text-rose-600 transition p-1"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: DESIGN VIEW (SCHEMA EDITOR) */}
          {viewMode === "design" && activeTable && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      Table Schema: {activeTable.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Define field names, data types, constraints, and relational mappings.
                    </p>
                  </div>
                  <button
                    onClick={handleAddField}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-700 text-white rounded text-xs font-semibold hover:bg-rose-800 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Field</span>
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-300 text-slate-600 text-left bg-slate-50">
                        <th className="p-2.5 font-semibold">Field Name</th>
                        <th className="p-2.5 font-semibold">Data Type</th>
                        <th className="p-2.5 font-semibold text-center">Primary Key</th>
                        <th className="p-2.5 font-semibold text-center">Nullable</th>
                        <th className="p-2.5 font-semibold">Foreign Key Ref</th>
                        <th className="p-2.5 font-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {activeTable.fields.map((field, fIdx) => (
                        <tr key={fIdx} className="hover:bg-slate-50 transition">
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={field.name}
                              onChange={(e) =>
                                handleUpdateField(fIdx, { name: e.target.value })
                              }
                              className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono font-medium focus:ring-1 focus:ring-rose-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2.5">
                            <select
                              value={field.type}
                              onChange={(e) =>
                                handleUpdateField(fIdx, {
                                  type: e.target.value as AccessDataType,
                                })
                              }
                              className="px-2 py-1 border border-slate-300 rounded text-xs bg-white focus:ring-1 focus:ring-rose-500 focus:outline-none"
                            >
                              <option value="TEXT">TEXT (Short / Long Text)</option>
                              <option value="NUMBER">NUMBER (Integer / Float)</option>
                              <option value="DATE">DATE (Date & Time)</option>
                              <option value="BOOLEAN">BOOLEAN (Yes / No)</option>
                              <option value="RELATION">RELATION (Foreign Key)</option>
                              <option value="JSON">JSON (Nested Object)</option>
                            </select>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={!!field.isPrimary}
                              onChange={(e) =>
                                handleUpdateField(fIdx, { isPrimary: e.target.checked })
                              }
                              className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={field.isNullable !== false}
                              onChange={(e) =>
                                handleUpdateField(fIdx, { isNullable: e.target.checked })
                              }
                              className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                            />
                          </td>
                          <td className="p-2.5">
                            {field.type === "RELATION" ? (
                              <input
                                type="text"
                                placeholder="e.g. departments.id"
                                value={
                                  field.references
                                    ? `${field.references.table}.${field.references.field}`
                                    : ""
                                }
                                onChange={(e) => {
                                  const [table, col] = e.target.value.split(".");
                                  handleUpdateField(fIdx, {
                                    references: { table: table || "", field: col || "id" },
                                  });
                                }}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-xs font-mono"
                              />
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => handleDeleteField(fIdx)}
                              className="text-slate-400 hover:text-rose-600 transition"
                              title="Delete column"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: RELATIONSHIPS (VISUAL ER DIAGRAM) */}
          {viewMode === "relationships" && (
            <div className="flex-1 flex flex-col p-6 overflow-auto">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      Entity-Relationship (ER) Canvas
                    </h2>
                    <p className="text-xs text-slate-500">
                      Visual diagram showing relational mapping and foreign key constraints.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    {database.relationships.length} active relations
                  </div>
                </div>

                {/* Visual Schema Canvas */}
                <div className="flex-1 mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4 bg-slate-50/50 rounded-lg border border-dashed border-slate-300">
                  {database.tables.map((table) => (
                    <div
                      key={table.id}
                      className="bg-white border-2 border-slate-300 rounded-lg shadow-sm overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-rose-800 to-rose-700 text-white px-3 py-2 text-xs font-bold flex items-center justify-between">
                        <span>{table.name}</span>
                        <span className="text-[10px] opacity-80">{table.records.length} rows</span>
                      </div>
                      <div className="p-2 divide-y divide-slate-100 text-xs">
                        {table.fields.map((f) => (
                          <div
                            key={f.name}
                            className="py-1.5 flex items-center justify-between"
                          >
                            <span className="flex items-center space-x-1.5">
                              {f.isPrimary && (
                                <Key className="w-3 h-3 text-amber-500 shrink-0" />
                              )}
                              <span className={f.isPrimary ? "font-bold text-slate-800" : "text-slate-700"}>
                                {f.name}
                              </span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {f.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Relationship Cards */}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">
                    Established Foreign Key Mappings
                  </h3>
                  <div className="space-y-2">
                    {database.relationships.map((rel) => (
                      <div
                        key={rel.id}
                        className="flex items-center space-x-2 text-xs bg-slate-50 p-2 rounded border border-slate-200"
                      >
                        <span className="font-semibold text-rose-800">{rel.fromTable}.{rel.fromField}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-indigo-700">{rel.toTable}.{rel.toField}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-auto">
                          {rel.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: SQL QUERY ENGINE */}
          {viewMode === "sql" && (
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden">
                <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Safe SQL Query Terminal</h2>
                    <p className="text-xs text-slate-500">
                      Write and run verified SELECT queries across your relational tables.
                    </p>
                  </div>
                  <button
                    onClick={handleExecuteSql}
                    className="flex items-center space-x-1.5 px-4 py-1.5 bg-rose-700 text-white rounded text-xs font-semibold hover:bg-rose-800 shadow transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Run Query</span>
                  </button>
                </div>

                {/* Code editor */}
                <div className="p-3 bg-slate-900 border-b border-slate-700">
                  <textarea
                    rows={4}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="w-full bg-transparent font-mono text-xs text-emerald-400 focus:outline-none resize-none leading-relaxed"
                    placeholder="SELECT * FROM departments WHERE budget > 200000;"
                  />
                </div>

                {/* Results Section */}
                <div className="flex-1 overflow-auto p-4">
                  {sqlResult?.error && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{sqlResult.error}</span>
                    </div>
                  )}

                  {sqlResult && !sqlResult.error && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          Query Result: {sqlResult.rows.length} rows returned
                        </span>
                        <span>Executed in {sqlResult.executionTimeMs} ms</span>
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              {sqlResult.columns.map((col) => (
                                <th
                                  key={col}
                                  className="text-left font-semibold text-slate-700 p-2.5"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {sqlResult.rows.map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                {sqlResult.columns.map((col) => (
                                  <td key={col} className="p-2.5 text-slate-800">
                                    {String(row[col] ?? "NULL")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {!sqlResult && (
                    <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs">
                      <div>
                        <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Click "Run Query" to execute the SQL statement above.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 5: FORMS VIEW (SINGLE RECORD ENTRY) */}
          {viewMode === "form" && activeTable && (
            <div className="flex-1 flex flex-col p-6 overflow-y-auto items-center">
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 max-w-xl w-full">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">
                      Record Form: {activeTable.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Step through individual records or input new entries.
                    </p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      disabled={formRecordIndex <= 0}
                      onClick={() => setFormRecordIndex((i) => Math.max(0, i - 1))}
                      className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-600 px-2">
                      {activeTable.records.length > 0 ? formRecordIndex + 1 : 0} of{" "}
                      {activeTable.records.length}
                    </span>
                    <button
                      disabled={formRecordIndex >= activeTable.records.length - 1}
                      onClick={() =>
                        setFormRecordIndex((i) =>
                          Math.min(activeTable.records.length - 1, i + 1)
                        )
                      }
                      className="p-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {activeTable.records[formRecordIndex] ? (
                  <div className="mt-4 space-y-4">
                    {activeTable.fields.map((f) => (
                      <div key={f.name}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {f.name} {f.isPrimary && <span className="text-amber-500">(PK)</span>}
                        </label>
                        <input
                          type={f.type === "NUMBER" ? "number" : "text"}
                          value={activeTable.records[formRecordIndex][f.name] ?? ""}
                          onChange={(e) =>
                            handleUpdateCell(
                              formRecordIndex,
                              f.name,
                              f.type === "NUMBER" ? Number(e.target.value) : e.target.value
                            )
                          }
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                        />
                      </div>
                    ))}
                    <div className="pt-2 flex justify-end space-x-2">
                      <button
                        onClick={handleAddRecord}
                        className="px-3 py-1.5 bg-rose-700 text-white rounded text-xs font-semibold hover:bg-rose-800 transition"
                      >
                        + Insert New Record
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No records found in this table. Click below to add one.
                    <div className="mt-3">
                      <button
                        onClick={handleAddRecord}
                        className="px-3 py-1.5 bg-rose-700 text-white rounded text-xs font-semibold"
                      >
                        Add Record
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW 6: REPORTS VIEW */}
          {viewMode === "report" && activeTable && (
            <div className="flex-1 flex flex-col p-8 overflow-y-auto items-center">
              <div className="bg-white rounded-lg border border-slate-300 shadow-md p-8 max-w-2xl w-full">
                <div className="border-b-2 border-rose-900 pb-4 mb-6">
                  <h1 className="text-xl font-bold text-slate-900">
                    {database.title}
                  </h1>
                  <p className="text-xs text-slate-500 mt-1">
                    Database Summary Report • Generated on{" "}
                    {new Date().toLocaleDateString()}
                  </p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-bold text-rose-800 uppercase tracking-wider mb-2">
                      Active Table: {activeTable.name}
                    </h2>
                    <p className="text-xs text-slate-600 mb-4">
                      Total records: <strong>{activeTable.records.length}</strong> | Columns:{" "}
                      <strong>{activeTable.fields.length}</strong>
                    </p>

                    <div className="border border-slate-200 rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                          <tr>
                            {activeTable.fields.map((f) => (
                              <th key={f.name} className="p-2 text-left">
                                {f.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {activeTable.records.map((r, i) => (
                            <tr key={i}>
                              {activeTable.fields.map((f) => (
                                <td key={f.name} className="p-2 text-slate-700">
                                  {String(r[f.name] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AccessStudio;
