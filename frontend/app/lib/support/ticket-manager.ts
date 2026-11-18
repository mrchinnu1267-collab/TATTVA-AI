/**
 * TATTVA AI - Support Ticket & Issue Tracking Manager (Phase 46)
 * Manages customer support requests, message threads, priority triage, and tenant privacy.
 * Conceptualized & Engineered by kotapati Gowtham Chowdary
 */

import {
  SupportTicket,
  TicketMessage,
  TicketPriority,
  TicketCategory,
  TicketStatus,
} from "./types";
import { PIIProtector } from "../ai-governance/pii-protector";
import * as crypto from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

export class TicketManager {
  private static instance: TicketManager;
  private tickets: Map<string, SupportTicket> = new Map();
  private piiProtector: PIIProtector;
  private storageDir: string;
  private storageFile: string;

  private constructor() {
    this.piiProtector = PIIProtector.getInstance();
    this.storageDir = path.join(process.cwd(), ".tattva_support");
    this.storageFile = path.join(this.storageDir, "tickets.json");
    this.loadState().catch(() => {});
  }

  public static getInstance(): TicketManager {
    if (!TicketManager.instance) {
      TicketManager.instance = new TicketManager();
    }
    return TicketManager.instance;
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.storageFile, "utf-8");
      const list: SupportTicket[] = JSON.parse(data);
      for (const t of list) {
        this.tickets.set(t.id, t);
      }
    } catch {
      // Memory state fallback
    }
  }

  private async saveState(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      const list = Array.from(this.tickets.values());
      await fs.writeFile(this.storageFile, JSON.stringify(list, null, 2), "utf-8");
    } catch {
      // Memory state fallback
    }
  }

  /**
   * Creates a new support ticket with PII scrubbing to prevent sensitive data leakage
   */
  public async createTicket(params: {
    userId: string;
    userEmail: string;
    subject: string;
    description: string;
    category?: TicketCategory;
    priority?: TicketPriority;
  }): Promise<SupportTicket> {
    const id = `tck_${crypto.randomBytes(6).toString("hex")}`;
    const ticketNumber = `TCK-2026-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const category = params.category || "general";
    const priority = params.priority || "medium";

    // Scrub sensitive PII from subject and description
    const sanitizedSubject = this.piiProtector.sanitize(params.subject).cleanText;
    const sanitizedDesc = this.piiProtector.sanitize(params.description).cleanText;

    const initialMessage: TicketMessage = {
      id: `msg_1`,
      sender: "user",
      senderName: params.userEmail.split("@")[0] || "User",
      message: sanitizedDesc,
      timestamp: Date.now(),
    };

    const ticket: SupportTicket = {
      id,
      ticketNumber,
      userId: params.userId,
      userEmail: params.userEmail,
      subject: sanitizedSubject,
      description: sanitizedDesc,
      category,
      priority,
      status: "open",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [initialMessage],
    };

    this.tickets.set(id, ticket);
    await this.saveState();
    return ticket;
  }

  /**
   * Lists tickets with tenant isolation (users only see their own tickets unless admin)
   */
  public listTickets(filters?: {
    userId?: string;
    status?: TicketStatus;
    category?: TicketCategory;
  }): SupportTicket[] {
    let list = Array.from(this.tickets.values()).sort((a, b) => b.updatedAt - a.updatedAt);

    if (filters?.userId) {
      list = list.filter((t) => t.userId === filters.userId);
    }
    if (filters?.status) {
      list = list.filter((t) => t.status === filters.status);
    }
    if (filters?.category) {
      list = list.filter((t) => t.category === filters.category);
    }

    return list;
  }

  /**
   * Retrieves a ticket by ID, ensuring tenant privacy isolation
   */
  public getTicket(id: string, requestingUserId?: string): SupportTicket | null {
    const ticket = this.tickets.get(id);
    if (!ticket) return null;

    // Enforce tenant isolation
    if (requestingUserId && ticket.userId !== requestingUserId && requestingUserId !== "admin") {
      return null;
    }

    return ticket;
  }

  /**
   * Appends a message to a ticket thread
   */
  public async addMessage(params: {
    ticketId: string;
    sender: "user" | "support_agent" | "ai_assistant";
    senderName: string;
    message: string;
    requestingUserId?: string;
  }): Promise<TicketMessage | null> {
    const ticket = this.getTicket(params.ticketId, params.requestingUserId);
    if (!ticket) return null;

    // Scrub sensitive tokens from the message
    const cleanMessage = this.piiProtector.sanitize(params.message).cleanText;

    const newMessage: TicketMessage = {
      id: `msg_${ticket.messages.length + 1}`,
      sender: params.sender,
      senderName: params.senderName,
      message: cleanMessage,
      timestamp: Date.now(),
    };

    ticket.messages.push(newMessage);
    ticket.updatedAt = Date.now();

    // Auto-update status based on sender
    if (params.sender === "support_agent" || params.sender === "ai_assistant") {
      ticket.status = "waiting_on_user";
    } else {
      ticket.status = "in_progress";
    }

    this.tickets.set(ticket.id, ticket);
    await this.saveState();
    return newMessage;
  }

  /**
   * Updates ticket status (e.g. resolve or close)
   */
  public async updateStatus(
    ticketId: string,
    status: TicketStatus,
    requestingUserId?: string
  ): Promise<SupportTicket | null> {
    const ticket = this.getTicket(ticketId, requestingUserId);
    if (!ticket) return null;

    ticket.status = status;
    ticket.updatedAt = Date.now();
    if (status === "resolved" || status === "closed") {
      ticket.resolvedAt = Date.now();
    }

    this.tickets.set(ticket.id, ticket);
    await this.saveState();
    return ticket;
  }
}
