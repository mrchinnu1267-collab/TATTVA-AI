/**
 * TATTVA AI - Tenant-Isolated Dataset Store
 * In-memory dataset registry with disk backup and sample dataset provisioning
 */

import * as fs from "fs";
import * as path from "path";
import os from "node:os";
import { Dataset, ColumnSchema } from "./types";
import { DataParser } from "./data-parser";

const STORAGE_DIR = path.join(/*turbopackIgnore: true*/ os.tmpdir(), ".tattva_datasets");

export class DatasetStore {
  private static store: Map<string, Map<string, Dataset>> = new Map();

  private static getPartitionKey(tenantId: string, workspaceId: string): string {
    return `${tenantId}__${workspaceId}`;
  }

  private static ensureStorageDir(): void {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
    } catch {
      // Non-fatal
    }
  }

  private static saveToDisk(tenantId: string, workspaceId: string, dataset: Dataset): void {
    try {
      this.ensureStorageDir();
      const filename = path.join(STORAGE_DIR, `${tenantId}__${workspaceId}__${dataset.id}.json`);
      fs.writeFileSync(filename, JSON.stringify(dataset, null, 2), "utf-8");
    } catch {
      // Non-fatal
    }
  }

  private static loadFromDisk(tenantId: string, workspaceId: string): Dataset[] {
    const results: Dataset[] = [];
    try {
      if (!fs.existsSync(STORAGE_DIR)) return [];
      const prefix = `${tenantId}__${workspaceId}__`;
      const files = fs.readdirSync(STORAGE_DIR);
      for (const file of files) {
        if (file.startsWith(prefix) && file.endsWith(".json")) {
          const content = fs.readFileSync(path.join(STORAGE_DIR, file), "utf-8");
          results.push(JSON.parse(content));
        }
      }
    } catch {
      // Non-fatal
    }
    return results;
  }

  /**
   * Retrieves all datasets for a tenant/workspace partition
   */
  public static listDatasets(tenantId: string, workspaceId: string): Dataset[] {
    const key = this.getPartitionKey(tenantId, workspaceId);
    let partition = this.store.get(key);

    if (!partition) {
      partition = new Map();
      const loaded = this.loadFromDisk(tenantId, workspaceId);
      for (const d of loaded) {
        partition.set(d.id, d);
      }
      this.store.set(key, partition);
    }

    if (partition.size === 0) {
      // Provision default sample dataset
      const sample = this.createSampleDataset(tenantId, workspaceId);
      partition.set(sample.id, sample);
    }

    return Array.from(partition.values());
  }

  /**
   * Retrieves a single dataset by ID
   */
  public static getDataset(tenantId: string, workspaceId: string, datasetId: string): Dataset | null {
    const datasets = this.listDatasets(tenantId, workspaceId);
    return datasets.find((d) => d.id === datasetId) || null;
  }

  /**
   * Saves or uploads a new dataset
   */
  public static saveDataset(
    tenantId: string,
    workspaceId: string,
    name: string,
    rows: Record<string, any>[]
  ): Dataset {
    const columns = DataParser.inferSchema(rows);
    const id = `ds_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const dataset: Dataset = {
      id,
      name: name.trim(),
      tenantId,
      workspaceId,
      rowCount: rows.length,
      columnCount: columns.length,
      columns,
      rows,
      createdAt: new Date().toISOString(),
    };

    const key = this.getPartitionKey(tenantId, workspaceId);
    let partition = this.store.get(key);
    if (!partition) {
      partition = new Map();
      this.store.set(key, partition);
    }
    partition.set(dataset.id, dataset);
    this.saveToDisk(tenantId, workspaceId, dataset);

    return dataset;
  }

  /**
   * Creates a rich, realistic sample e-commerce customer analytics dataset
   */
  public static createSampleDataset(tenantId: string, workspaceId: string): Dataset {
    const categories = ["Electronics", "Fashion", "Home & Kitchen", "Fitness", "Books"];
    const rows: Record<string, any>[] = [];

    for (let i = 1; i <= 60; i++) {
      const category = categories[i % categories.length];
      const revenue = Math.round((50 + (i * 37) % 850 + Math.random() * 50) * 100) / 100;
      const quantity = 1 + (i % 8);
      const satisfaction = Math.min(5, Math.max(1, Math.round((3.2 + (i % 3) * 0.6) * 10) / 10));
      const churned = revenue < 200 || satisfaction < 2.5;

      rows.push({
        customerId: `CUST_${1000 + i}`,
        category,
        revenue,
        quantity,
        satisfactionScore: satisfaction,
        churned,
      });
    }

    // Add 2 explicit outliers for testing detection
    rows.push({
      customerId: "CUST_9998",
      category: "Electronics",
      revenue: 9500.0, // High outlier
      quantity: 50,
      satisfactionScore: 5.0,
      churned: false,
    });
    rows.push({
      customerId: "CUST_9999",
      category: "Books",
      revenue: 2.5,
      quantity: 1,
      satisfactionScore: 1.0,
      churned: true,
    });

    const dataset = this.saveDataset(
      tenantId,
      workspaceId,
      "E-Commerce Customer & Sales Analytics",
      rows
    );
    return dataset;
  }
}
