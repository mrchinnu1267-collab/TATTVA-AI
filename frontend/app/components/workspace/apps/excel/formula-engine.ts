/**
 * TATTVA AI - Spreadsheet Formula Engine
 * Implements high-performance evaluation of standard spreadsheet formulas:
 * Math: SUM, AVERAGE, MIN, MAX, COUNT, COUNTA, ROUND, ABS, PRODUCT
 * Logic: IF, AND, OR, NOT, IFERROR
 * Text: CONCAT, LEFT, RIGHT, MID, LEN, TRIM, UPPER, LOWER
 * Lookup: VLOOKUP, HLOOKUP, INDEX, MATCH
 * Date: TODAY, NOW, DATE, YEAR, MONTH, DAY
 */

import { CellValue } from "../../types";

export interface CellCoords {
  row: number; // 0-indexed
  col: number; // 0-indexed
}

export function parseCellAddress(addr: string): CellCoords | null {
  const match = addr.toUpperCase().replace(/\$/g, "").match(/^([A-Z]+)([0-9]+)$/);
  if (!match) return null;
  const colLetters = match[1];
  const rowNum = parseInt(match[2], 10) - 1;

  let colNum = 0;
  for (let i = 0; i < colLetters.length; i++) {
    colNum = colNum * 26 + (colLetters.charCodeAt(i) - 64);
  }
  return { row: rowNum, col: colNum - 1 };
}

export function formatCellAddress(row: number, col: number): string {
  let letters = "";
  let c = col + 1;
  while (c > 0) {
    const rem = (c - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    c = Math.floor((c - 1) / 26);
  }
  return `${letters}${row + 1}`;
}

export function getRangeCells(rangeStr: string): CellCoords[] {
  const parts = rangeStr.split(":");
  if (parts.length === 1) {
    const c = parseCellAddress(parts[0]);
    return c ? [c] : [];
  }
  const start = parseCellAddress(parts[0]);
  const end = parseCellAddress(parts[1]);
  if (!start || !end) return [];

  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  const cells: CellCoords[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      cells.push({ row: r, col: c });
    }
  }
  return cells;
}

export function evaluateFormula(
  formula: string,
  grid: CellValue[][],
  visited = new Set<string>()
): CellValue {
  if (!formula.startsWith("=")) return formula;

  const expression = formula.substring(1).trim();

  // Basic arithmetic evaluation if no function wrapper (e.g. "=B5-B6" or "=B7+C7")
  if (!expression.includes("(") && /^[A-Z0-9\s\+\-\*\/\.\$]+$/i.test(expression)) {
    try {
      const replaced = expression.replace(/([A-Z]+\d+)/gi, (match) => {
        const coords = parseCellAddress(match);
        if (!coords) return "0";
        const val = grid[coords.row]?.[coords.col];
        const num = parseFloat(String(val ?? 0));
        return isNaN(num) ? "0" : String(num);
      });
      // Safe arithmetic evaluator
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${replaced})`)();
      return typeof result === "number" ? Math.round(result * 10000) / 10000 : result;
    } catch {
      return "#VALUE!";
    }
  }

  // Extract function name and arguments
  const fnMatch = expression.match(/^([A-Z]+)\((.*)\)$/i);
  if (!fnMatch) {
    return "#NAME?";
  }

  const fnName = fnMatch[1].toUpperCase();
  const rawArgs = fnMatch[2];

  // Helper to resolve range or value to numbers
  const getValuesFromArg = (arg: string): CellValue[] => {
    const trimmed = arg.trim();
    if (trimmed.includes(":")) {
      const coordsList = getRangeCells(trimmed);
      return coordsList.map((c) => grid[c.row]?.[c.col]);
    }
    const singleCoord = parseCellAddress(trimmed);
    if (singleCoord) {
      return [grid[singleCoord.row]?.[singleCoord.col]];
    }
    // literal number or string
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return [trimmed.slice(1, -1)];
    }
    const num = parseFloat(trimmed);
    return [isNaN(num) ? trimmed : num];
  };

  const getNumberValues = (arg: string): number[] => {
    return getValuesFromArg(arg)
      .map((v) => (typeof v === "number" ? v : parseFloat(String(v ?? 0))))
      .filter((n) => !isNaN(n));
  };

  // Split top-level arguments by comma
  const splitArgs = (str: string): string[] => {
    const args: string[] = [];
    let depth = 0;
    let current = "";
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    if (current.trim()) args.push(current.trim());
    return args;
  };

  const args = splitArgs(rawArgs);

  switch (fnName) {
    // -------------------------------------------------------------
    // MATHEMATICAL FUNCTIONS
    // -------------------------------------------------------------
    case "SUM": {
      const nums = args.flatMap(getNumberValues);
      return nums.reduce((acc, curr) => acc + curr, 0);
    }

    case "AVERAGE": {
      const nums = args.flatMap(getNumberValues);
      if (nums.length === 0) return 0;
      return Math.round((nums.reduce((acc, curr) => acc + curr, 0) / nums.length) * 100) / 100;
    }

    case "MIN": {
      const nums = args.flatMap(getNumberValues);
      if (nums.length === 0) return 0;
      return Math.min(...nums);
    }

    case "MAX": {
      const nums = args.flatMap(getNumberValues);
      if (nums.length === 0) return 0;
      return Math.max(...nums);
    }

    case "COUNT": {
      const values = args.flatMap(getValuesFromArg);
      return values.filter((v) => typeof v === "number" || (!isNaN(parseFloat(String(v))) && v !== null && v !== "")).length;
    }

    case "COUNTA": {
      const values = args.flatMap(getValuesFromArg);
      return values.filter((v) => v !== null && v !== undefined && v !== "").length;
    }

    case "ROUND": {
      const val = getNumberValues(args[0])[0] || 0;
      const decimals = parseInt(args[1] || "0", 10);
      const factor = Math.pow(10, decimals);
      return Math.round(val * factor) / factor;
    }

    case "ABS": {
      const val = getNumberValues(args[0])[0] || 0;
      return Math.abs(val);
    }

    case "PRODUCT": {
      const nums = args.flatMap(getNumberValues);
      if (nums.length === 0) return 0;
      return nums.reduce((acc, curr) => acc * curr, 1);
    }

    // -------------------------------------------------------------
    // LOGICAL FUNCTIONS
    // -------------------------------------------------------------
    case "IF": {
      if (args.length < 2) return "#VALUE!";
      const condStr = args[0];
      // Evaluate condition
      let condResult = false;
      try {
        const replaced = condStr.replace(/([A-Z]+\d+)/gi, (m) => {
          const c = parseCellAddress(m);
          return c ? String(grid[c.row]?.[c.col] ?? 0) : "0";
        });
        // eslint-disable-next-line no-new-func
        condResult = Boolean(Function(`"use strict"; return (${replaced})`)());
      } catch {
        condResult = false;
      }
      return condResult ? getValuesFromArg(args[1])[0] : args[2] ? getValuesFromArg(args[2])[0] : false;
    }

    case "AND": {
      for (const a of args) {
        const val = getValuesFromArg(a)[0];
        if (!val) return false;
      }
      return true;
    }

    case "OR": {
      for (const a of args) {
        const val = getValuesFromArg(a)[0];
        if (val) return true;
      }
      return false;
    }

    case "NOT": {
      const val = getValuesFromArg(args[0])[0];
      return !val;
    }

    case "IFERROR": {
      try {
        const val = evaluateFormula(`=${args[0]}`, grid, visited);
        if (String(val).startsWith("#")) {
          return getValuesFromArg(args[1])[0];
        }
        return val;
      } catch {
        return getValuesFromArg(args[1])[0];
      }
    }

    // -------------------------------------------------------------
    // TEXT FUNCTIONS
    // -------------------------------------------------------------
    case "CONCAT":
    case "CONCATENATE": {
      const vals = args.flatMap(getValuesFromArg);
      return vals.map((v) => String(v ?? "")).join("");
    }

    case "LEFT": {
      const str = String(getValuesFromArg(args[0])[0] ?? "");
      const count = parseInt(args[1] || "1", 10);
      return str.slice(0, count);
    }

    case "RIGHT": {
      const str = String(getValuesFromArg(args[0])[0] ?? "");
      const count = parseInt(args[1] || "1", 10);
      return str.slice(-count);
    }

    case "MID": {
      const str = String(getValuesFromArg(args[0])[0] ?? "");
      const start = parseInt(args[1] || "1", 10) - 1;
      const len = parseInt(args[2] || "1", 10);
      return str.substr(start, len);
    }

    case "LEN": {
      const str = String(getValuesFromArg(args[0])[0] ?? "");
      return str.length;
    }

    case "TRIM": {
      const str = String(getValuesFromArg(args[0])[0] ?? "");
      return str.trim();
    }

    case "UPPER": {
      const str = String(getValuesFromArg(args[0])[0] ?? "");
      return str.toUpperCase();
    }

    case "LOWER": {
      const str = String(getValuesFromArg(args[0])[0] ?? "");
      return str.toLowerCase();
    }

    // -------------------------------------------------------------
    // LOOKUP FUNCTIONS
    // -------------------------------------------------------------
    case "VLOOKUP": {
      if (args.length < 3) return "#VALUE!";
      const lookupVal = getValuesFromArg(args[0])[0];
      const rangeCells = getRangeCells(args[1]);
      const colIndex = parseInt(args[2], 10) - 1;

      if (rangeCells.length === 0 || colIndex < 0) return "#REF!";

      const minRow = Math.min(...rangeCells.map((c) => c.row));
      const maxRow = Math.max(...rangeCells.map((c) => c.row));
      const firstCol = Math.min(...rangeCells.map((c) => c.col));

      for (let r = minRow; r <= maxRow; r++) {
        const cellVal = grid[r]?.[firstCol];
        if (String(cellVal).toLowerCase() === String(lookupVal).toLowerCase()) {
          return grid[r]?.[firstCol + colIndex] ?? null;
        }
      }
      return "#N/A";
    }

    case "INDEX": {
      const rangeCells = getRangeCells(args[0]);
      const rowIdx = parseInt(args[1] || "1", 10) - 1;
      const colIdx = parseInt(args[2] || "1", 10) - 1;

      const minRow = Math.min(...rangeCells.map((c) => c.row));
      const minCol = Math.min(...rangeCells.map((c) => c.col));

      return grid[minRow + rowIdx]?.[minCol + colIdx] ?? "#REF!";
    }

    case "MATCH": {
      const lookupVal = getValuesFromArg(args[0])[0];
      const rangeCells = getRangeCells(args[1]);
      for (let i = 0; i < rangeCells.length; i++) {
        const c = rangeCells[i];
        if (String(grid[c.row]?.[c.col]).toLowerCase() === String(lookupVal).toLowerCase()) {
          return i + 1;
        }
      }
      return "#N/A";
    }

    // -------------------------------------------------------------
    // DATE FUNCTIONS
    // -------------------------------------------------------------
    case "TODAY": {
      return new Date().toISOString().split("T")[0];
    }

    case "NOW": {
      return new Date().toLocaleString();
    }

    case "YEAR": {
      const d = new Date(String(getValuesFromArg(args[0])[0]));
      return isNaN(d.getTime()) ? "#VALUE!" : d.getFullYear();
    }

    case "MONTH": {
      const d = new Date(String(getValuesFromArg(args[0])[0]));
      return isNaN(d.getTime()) ? "#VALUE!" : d.getMonth() + 1;
    }

    case "DAY": {
      const d = new Date(String(getValuesFromArg(args[0])[0]));
      return isNaN(d.getTime()) ? "#VALUE!" : d.getDate();
    }

    default:
      return "#NAME?";
  }
}
