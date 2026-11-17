/**
 * TATTVA AI - Data Parsing & Schema Inference Engine
 * Ingests CSV, JSON, and structured tabular data with automated type inference
 */

import { ColumnSchema, ColumnDataType } from "./types";

export class DataParser {
  /**
   * Parses CSV text into array of object records
   */
  public static parseCSV(csvContent: string): Record<string, any>[] {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return [];

    const headers = this.parseCSVLine(lines[0]);
    const records: Record<string, any>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const record: Record<string, any> = {};

      for (let j = 0; j < headers.length; j++) {
        const header = headers[j];
        const raw = values[j] !== undefined ? values[j].trim() : "";
        record[header] = this.coerceValue(raw);
      }
      records.push(record);
    }

    return records;
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(cur);
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur);
    return result.map((s) => s.replace(/^["']|["']$/g, "").trim());
  }

  private static coerceValue(val: string): any {
    if (val === "" || val === "null" || val === "NULL" || val === "NA" || val === "NaN") {
      return null;
    }
    if (val.toLowerCase() === "true") return true;
    if (val.toLowerCase() === "false") return false;

    // Check numeric
    if (!isNaN(Number(val)) && !val.includes("-") && !val.includes("/")) {
      const num = Number(val);
      if (!isNaN(num)) return num;
    }

    return val;
  }

  /**
   * Infers column schemas from dataset records
   */
  public static inferSchema(records: Record<string, any>[]): ColumnSchema[] {
    if (records.length === 0) return [];

    const keys = Object.keys(records[0]);
    const schemas: ColumnSchema[] = [];

    for (const key of keys) {
      let nullCount = 0;
      const values: any[] = [];
      const distinct = new Set<any>();

      for (const r of records) {
        const v = r[key];
        if (v === null || v === undefined || v === "") {
          nullCount++;
        } else {
          values.push(v);
          distinct.add(v);
        }
      }

      const inferredType = this.detectColumnType(values);

      schemas.push({
        name: key,
        type: inferredType,
        nullable: nullCount > 0,
        uniqueCount: distinct.size,
        sampleValues: Array.from(distinct).slice(0, 5),
      });
    }

    return schemas;
  }

  private static detectColumnType(values: any[]): ColumnDataType {
    if (values.length === 0) return "text";

    let numericCount = 0;
    let booleanCount = 0;
    let dateCount = 0;

    for (const v of values) {
      if (typeof v === "number") numericCount++;
      else if (typeof v === "boolean") booleanCount++;
      else if (typeof v === "string") {
        if (!isNaN(Number(v))) numericCount++;
        else if (v.toLowerCase() === "true" || v.toLowerCase() === "false") booleanCount++;
        else if (!isNaN(Date.parse(v)) && (v.includes("-") || v.includes("/"))) dateCount++;
      }
    }

    const total = values.length;
    if (numericCount / total >= 0.8) return "numeric";
    if (booleanCount / total >= 0.8) return "boolean";
    if (dateCount / total >= 0.8) return "datetime";

    const distinct = new Set(values);
    if (distinct.size <= 20 || distinct.size / total <= 0.2) return "categorical";

    return "text";
  }
}
