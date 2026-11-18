/**
 * TATTVA AI - Invoice Generation & Billing Documentation Engine (Phase 45)
 * Generates audit-ready commercial invoices with line items, tax IDs, and billing statements.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import { Invoice, InvoiceLineItem, BillingCycle } from "./types";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export class InvoiceGenerator {
  private static instance: InvoiceGenerator;
  private invoices: Map<string, Invoice> = new Map();
  private storageDir: string;
  private storageFile: string;

  private constructor() {
    this.storageDir = path.join(process.cwd(), ".tattva_billing");
    this.storageFile = path.join(this.storageDir, "invoices.json");
    this.loadState().catch(() => {});
  }

  public static getInstance(): InvoiceGenerator {
    if (!InvoiceGenerator.instance) {
      InvoiceGenerator.instance = new InvoiceGenerator();
    }
    return InvoiceGenerator.instance;
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, "utf-8");
      const list: Invoice[] = JSON.parse(data);
      for (const item of list) {
        this.invoices.set(item.id, item);
      }
    } catch {
      // Memory state fallback
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      const list = Array.from(this.invoices.values());
      await fs.writeFile(this.storageFile, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // Memory state fallback
    }
  }

  /**
   * Generates a new commercial invoice
   */
  public async createInvoice(params: {
    userId: string;
    subscriptionId?: string;
    customerName: string;
    customerEmail: string;
    billingCycle?: BillingCycle;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
    currency?: string;
    status?: "paid" | "open" | "void";
    taxRatePercent?: number;
  }): Promise<Invoice> {
    const id = `inv_${crypto.randomBytes(6).toString("hex")}`;
    const invoiceNumber = `INV-2026-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const currency = params.currency || "USD";
    const billingCycle = params.billingCycle || "monthly";
    const status = params.status || "paid";

    const items: InvoiceLineItem[] = params.lineItems.map((item, index) => ({
      id: `item_${index + 1}`,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      amount: Math.round(item.quantity * item.unitPrice * 100) / 100,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = params.taxRatePercent !== undefined ? params.taxRatePercent : 0; // Tax %
    const taxAmount = Math.round((subtotal * taxRate) / 100 * 100) / 100;
    const total = subtotal + taxAmount;

    const invoice: Invoice = {
      id,
      invoiceNumber,
      userId: params.userId,
      subscriptionId: params.subscriptionId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      amountDue: status === "paid" ? 0 : total,
      amountPaid: status === "paid" ? total : 0,
      currency,
      status,
      billingCycle,
      lineItems: items,
      subtotal,
      taxAmount,
      total,
      createdAt: Date.now(),
      paidAt: status === "paid" ? Date.now() : undefined,
      pdfDownloadUrl: `/api/billing/invoices?id=${id}&format=html`,
    };

    this.invoices.set(id, invoice);
    await this.saveState();
    return invoice;
  }

  /**
   * Lists invoices for a specific tenant or all
   */
  public listInvoices(userId?: string): Invoice[] {
    const all = Array.from(this.invoices.values()).sort((a, b) => b.createdAt - a.createdAt);
    if (userId) {
      return all.filter((inv) => inv.userId === userId);
    }
    return all;
  }

  /**
   * Retrieves an invoice by ID
   */
  public getInvoice(id: string): Invoice | null {
    return this.invoices.get(id) || null;
  }

  /**
   * Renders print-ready HTML for an invoice
   */
  public renderInvoiceHtml(invoice: Invoice): string {
    const itemsHtml = invoice.lineItems
      .map(
        (item) => `
        <tr style="border-bottom: 1px solid #334155;">
          <td style="padding: 12px 8px; color: #f8fafc;">${item.description}</td>
          <td style="padding: 12px 8px; text-align: center; color: #94a3b8;">${item.quantity}</td>
          <td style="padding: 12px 8px; text-align: right; color: #94a3b8;">$${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 12px 8px; text-align: right; color: #10b981; font-weight: bold;">$${item.amount.toFixed(2)}</td>
        </tr>`
      )
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoiceNumber} | TATTVA AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #020617; color: #f8fafc; padding: 40px; margin: 0; }
    .card { max-width: 700px; margin: auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { display: flex; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 24px; margin-bottom: 24px; }
    .brand { font-size: 22px; font-weight: bold; color: #10b981; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 9999px; background: #10b98120; color: #34d399; border: 1px solid #10b98140; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { text-align: left; padding: 8px; color: #64748b; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #334155; }
    .summary { margin-top: 24px; display: flex; justify-content: flex-end; }
    .summary-box { width: 240px; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; }
    .summary-total { border-top: 1px solid #334155; margin-top: 6px; padding-top: 10px; font-weight: bold; font-size: 16px; color: #10b981; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="brand">TATTVA AI Inc.</div>
        <div style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Next-Gen Sovereign AI Conversational Platform</div>
      </div>
      <div style="text-align: right;">
        <span class="status">${invoice.status}</span>
        <div style="font-size: 14px; font-weight: bold; margin-top: 8px; color: #e2e8f0;">${invoice.invoiceNumber}</div>
        <div style="font-size: 12px; color: #64748b;">${new Date(invoice.createdAt).toLocaleDateString()}</div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 13px; color: #94a3b8;">
      <div>
        <strong style="color: #e2e8f0;">Billed To:</strong><br />
        ${invoice.customerName}<br />
        ${invoice.customerEmail}
      </div>
      <div style="text-align: right;">
        <strong style="color: #e2e8f0;">Payment Info:</strong><br />
        Cycle: ${invoice.billingCycle.toUpperCase()}<br />
        Currency: ${invoice.currency}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="summary">
      <div class="summary-box">
        <div class="summary-row">
          <span style="color: #94a3b8;">Subtotal:</span>
          <span>$${invoice.subtotal.toFixed(2)}</span>
        </div>
        <div class="summary-row">
          <span style="color: #94a3b8;">Tax:</span>
          <span>$${invoice.taxAmount.toFixed(2)}</span>
        </div>
        <div class="summary-row summary-total">
          <span>Total Paid:</span>
          <span>$${invoice.total.toFixed(2)} ${invoice.currency}</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
