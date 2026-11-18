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

function resolveUser(request: Request, sessionUser: any) {
  if (sessionUser && sessionUser.authenticated && !sessionUser.isGuest) {
    return {
      userId: sessionUser.userId,
      email: sessionUser.email,
    };
  }

  const customHeader = request.headers.get("x-tattva-session");
  if (customHeader) {
    try {
      const part = customHeader.includes(".") ? customHeader.split(".")[0] : customHeader;
      const raw = Buffer.from(part, "base64url").toString("utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.userId || parsed.email) {
        return {
          userId: parsed.userId || parsed.email,
          email: parsed.email || "user@tattva.ai",
        };
      }
    } catch {}
    try {
      const raw = Buffer.from(customHeader, "base64").toString("utf-8");
      const parsed = JSON.parse(raw);
      if (parsed.userId || parsed.email) {
        return {
          userId: parsed.userId || parsed.email,
          email: parsed.email || "user@tattva.ai",
        };
      }
    } catch {}
  }

  const explicitUserId = request.headers.get("x-user-id");
  if (explicitUserId) {
    return {
      userId: explicitUserId,
      email: request.headers.get("x-user-email") || `${explicitUserId}@tattva.ai`,
    };
  }

  return {
    userId: sessionUser?.userId || "guest_user",
    email: sessionUser?.email || "guest@tattva.ai",
  };
}

export async function GET(request: Request) {
  try {
    const sessionUser = await verifyUserSession(request);
    const user = resolveUser(request, sessionUser);
    const userId = user.userId;
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
    const sessionUser = await verifyUserSession(request);
    const user = resolveUser(request, sessionUser);
    const userId = user.userId;
    const userEmail = user.email;
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
    const sessionUser = await verifyUserSession(request);
    const user = resolveUser(request, sessionUser);
    const userId = user.userId;
    const body = await request.json().catch(() => ({}));
    const { id, ticketId, status, message, sender, senderName } = body;
    const targetId = id || ticketId;

    if (!targetId) {
      return NextResponse.json(
        { success: false, error: "Ticket id (or ticketId) is required" },
        { status: 400 }
      );
    }

    const engine = CustomerSupportEngine.getInstance();

    if (message) {
      const reply = await engine.replyToTicket({
        ticketId: targetId,
        sender: sender || "user",
        senderName: senderName || user.email?.split("@")[0] || "User",
        message,
        requestingUserId: userId,
      });

      if (!reply) {
        return NextResponse.json(
          { success: false, error: "Failed to reply or unauthorized" },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, message: reply, reply });
    }

    if (status) {
      const updated = await engine.updateTicketStatus(targetId, status, userId);

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Ticket not found or unauthorized" },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, ticket: updated });
    }

    return NextResponse.json(
      { success: false, error: "Either status or message must be provided" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
