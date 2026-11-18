/**
 * TATTVA AI - Billing Invoices API Route (Phase 45)
 * GET /api/billing/invoices -> Lists invoices or outputs print-ready HTML
 * POST /api/billing/invoices -> Creates an invoice record
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { BillingEngine } from "../../../lib/billing";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const userId = user.userId || "authenticated_user";
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const format = searchParams.get("format");

    const engine = BillingEngine.getInstance();

    if (id) {
      const invoice = engine.getInvoice(id);
      if (!invoice) {
        return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
      }

      if (format === "html") {
        const html = engine.renderInvoiceHtml(invoice);
        return new NextResponse(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      return NextResponse.json({ success: true, invoice });
    }

    const invoices = engine.getInvoices(userId);
    return NextResponse.json({ success: true, invoices });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const userId = user.userId || "authenticated_user";
    const body = await request.json().catch(() => ({}));
    const { customerName, customerEmail, lineItems, currency = "USD" } = body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "lineItems array is required" },
        { status: 400 }
      );
    }

    const engine = BillingEngine.getInstance();
    const invoice = await engine.createInvoice({
      userId,
      customerName: customerName || user.email || "Valued Subscriber",
      customerEmail: customerEmail || user.email || "subscriber@tattva.ai",
      lineItems,
      currency,
      status: "paid",
    });

    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
