/**
 * TATTVA AI - Support Tickets API Route (Phase 46)
 * GET /api/support/tickets -> Lists user's tickets or gets specific ticket details
 * POST /api/support/tickets -> Creates a new support ticket or replies to an existing ticket
 * PUT /api/support/tickets -> Updates ticket status (resolve/close)
 */

import { NextResponse } from "next/server";
import { verifyUserSession } from "../../../lib/security";
import { CustomerSupportEngine } from "../../../lib/support";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const userId = user.userId || "authenticated_user";
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = (searchParams.get("status") || undefined) as any;
    const category = (searchParams.get("category") || undefined) as any;

    const engine = CustomerSupportEngine.getInstance();

    if (id) {
      const ticket = engine.getTicket(id, userId);
      if (!ticket) {
        return NextResponse.json({ success: false, error: "Ticket not found or unauthorized" }, { status: 404 });
      }
      return NextResponse.json({ success: true, ticket });
    }

    const tickets = engine.listTickets({ userId, status, category });
    const metrics = engine.getMetrics();

    return NextResponse.json({ success: true, tickets, metrics });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const userId = user.userId || "authenticated_user";
    const userEmail = user.email || "user@tattva.ai";
    const body = await request.json().catch(() => ({}));
    const { action = "create", ticketId, subject, description, category, priority, message } = body;

    const engine = CustomerSupportEngine.getInstance();

    if (action === "reply" && ticketId && message) {
      const reply = await engine.replyToTicket({
        ticketId,
        sender: "user",
        senderName: userEmail.split("@")[0] || "User",
        message,
        requestingUserId: userId,
      });

      if (!reply) {
        return NextResponse.json({ success: false, error: "Failed to reply or unauthorized" }, { status: 403 });
      }

      return NextResponse.json({ success: true, reply });
    }

    if (!subject || !description) {
      return NextResponse.json(
        { success: false, error: "subject and description are required to create a ticket" },
        { status: 400 }
      );
    }

    const ticket = await engine.createTicket({
      userId,
      userEmail,
      subject,
      description,
      category,
      priority,
    });

    return NextResponse.json({ success: true, ticket });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await verifyUserSession(request);
    const userId = user.userId || "authenticated_user";
    const body = await request.json().catch(() => ({}));
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: "Ticket id and status are required" },
        { status: 400 }
      );
    }

    const engine = CustomerSupportEngine.getInstance();
    const updated = await engine.updateTicketStatus(id, status, userId);

    if (!updated) {
      return NextResponse.json({ success: false, error: "Ticket not found or unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true, ticket: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
