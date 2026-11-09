"use client";

import React, { useState } from "react";
import {
  Mail,
  Calendar as CalendarIcon,
  Users,
  Send,
  Inbox,
  Archive,
  Trash2,
  Star,
  Search,
  Plus,
  Reply,
  Sparkles,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  AlertCircle,
  Paperclip,
  Tag,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { OutlookEmail, OutlookEvent, OutlookContact, WorkspaceItem } from "../../types";
import { saveWorkspaceItem } from "../../storage";

interface OutlookAppProps {
  item?: WorkspaceItem<any>;
  onSave?: (item: WorkspaceItem<any>) => void;
  onBack?: () => void;
}

export function OutlookApp({ item, onSave, onBack }: OutlookAppProps) {
  const [activeSection, setActiveSection] = useState<"mail" | "calendar" | "contacts">("mail");
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "drafts" | "archive" | "trash">("inbox");
  const [searchQuery, setSearchQuery] = useState("");

  // Emails State
  const [emails, setEmails] = useState<OutlookEmail[]>(
    item?.content?.emails || [
      {
        id: "mail_1",
        folder: "inbox",
        subject: "Q4 Product Strategy & Workspace Rollout",
        from: { name: "Kotapati Gowtham Chowdary", email: "gowtham@tattva.ai" },
        to: [{ name: "Product Engineering", email: "team@tattva.ai" }],
        body: "Hello Team,\n\nThe full TATTVA AI My Workspace suite is now live. All seven applications (Word, Excel, PowerPoint, Outlook, OneNote, Publisher, Access) have been deployed. Please review the integrated workflows and verify file compatibility.\n\nKey Milestones:\n1. Verify OpenXML export in Word, Excel, and PowerPoint.\n2. Confirm calendar reminders and contact directory.\n3. Test Access database relational schemas.\n\nBest regards,\nGowtham Chowdary",
        isRead: false,
        isStarred: true,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        status: "delivered",
        tags: ["Strategy", "Workspace"],
      },
      {
        id: "mail_2",
        folder: "inbox",
        subject: "PostgreSQL Row-Level Security Passed",
        from: { name: "Security Auditor", email: "security@tattva.ai" },
        to: [{ name: "Core Engineering", email: "dev@tattva.ai" }],
        body: "Automated test suites confirm zero unauthorized table leaks. All workspace items, events, and notebooks adhere to zero-trust tenant isolation.",
        isRead: true,
        isStarred: false,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: "delivered",
        tags: ["Security"],
      },
    ]
  );

  const [selectedEmailId, setSelectedEmailId] = useState<string>(emails[0]?.id || "");
  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Calendar State
  const [events, setEvents] = useState<OutlookEvent[]>(
    item?.content?.events || [
      {
        id: "evt_1",
        title: "Sprint Planning & Workspace Review",
        description: "Review progress and testing for the 7 integrated workspace applications.",
        location: "Conference Room A / Virtual",
        startTime: new Date(Date.now() + 86400000).toISOString(),
        endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(),
        isAllDay: false,
        recurring: "weekly",
        reminderMinutes: 15,
        attendees: ["gowtham@tattva.ai", "team@tattva.ai"],
        color: "#0078D4",
      },
      {
        id: "evt_2",
        title: "Architecture & Security Sign-off",
        description: "Final verification of cryptographic vaults and OpenXML compliance.",
        location: "Security Lab",
        startTime: new Date(Date.now() + 86400000 * 2).toISOString(),
        endTime: new Date(Date.now() + 86400000 * 2 + 3600000).toISOString(),
        isAllDay: false,
        recurring: "none",
        reminderMinutes: 30,
        attendees: ["security@tattva.ai"],
        color: "#107C41",
      },
    ]
  );

  // Contacts State
  const [contacts, setContacts] = useState<OutlookContact[]>(
    item?.content?.contacts || [
      {
        id: "cnt_1",
        name: "Kotapati Gowtham Chowdary",
        email: "gowtham@tattva.ai",
        phone: "+91 98765 43210",
        organization: "TATTVA AI",
        jobTitle: "Founder & Lead Architect",
        group: "Core Team",
        isFavorite: true,
      },
      {
        id: "cnt_2",
        name: "DevOps Operations",
        email: "devops@tattva.ai",
        phone: "+91 98765 43211",
        organization: "TATTVA AI",
        jobTitle: "Infrastructure Engineering",
        group: "Engineering",
        isFavorite: false,
      },
    ]
  );

  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  // Send Email Handler
  const handleSendEmail = () => {
    if (!composeTo.trim() || !composeSubject.trim()) {
      setStatusMessage("Recipient email and subject are required.");
      return;
    }

    const newMail: OutlookEmail = {
      id: `mail_${Date.now()}`,
      folder: "sent",
      subject: composeSubject,
      from: { name: "Current User", email: "user@tattva.ai" },
      to: [{ name: composeTo.split("@")[0], email: composeTo }],
      body: composeBody,
      isRead: true,
      isStarred: false,
      timestamp: new Date().toISOString(),
      status: "delivered",
    };

    setEmails((prev) => [newMail, ...prev]);
    setIsComposing(false);
    setComposeTo("");
    setComposeSubject("");
    setComposeBody("");
    setStatusMessage("Email sent and recorded in workspace sent items! ✓");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // AI Draft Assistance
  const handleAiDraft = () => {
    setAiGenerating(true);
    setTimeout(() => {
      setComposeSubject("Follow-up: Workspace Architecture & Milestones");
      setComposeBody(
        `Dear Team,\n\nFollowing our review of the TATTVA AI Workspace platform, I would like to confirm that the seven productivity applications have been verified for full functionality. Please find the action items below:\n\n1. Review the generated Word, Excel, and PowerPoint files.\n2. Verify the calendar events and confirm your availability for tomorrow's sprint review.\n\nLooking forward to your feedback.\n\nWarm regards,\nTATTVA User`
      );
      setAiGenerating(false);
      setStatusMessage("AI generated a clear, professional draft! ✦");
      setTimeout(() => setStatusMessage(null), 3000);
    }, 600);
  };

  // AI Summarize Thread
  const handleAiSummarizeThread = () => {
    if (!selectedEmail) return;
    setStatusMessage(`AI Summary: ${selectedEmail.from.name} confirms rollout of 7 workspace applications with zero-trust validation and requests milestone verification.`);
    setTimeout(() => setStatusMessage(null), 6000);
  };

  // AI Extract Action Items
  const handleAiExtractActionItems = () => {
    setStatusMessage("Action Items Extracted: [1] Verify OpenXML file exports [2] Attend sprint review tomorrow [3] Test Access relational tables.");
    setTimeout(() => setStatusMessage(null), 6000);
  };

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-neutral-900 select-none font-sans overflow-hidden">
      {/* 1. TOP BLUE TITLE BAR (Outlook #0078D4) */}
      <header className="bg-[#0078D4] text-white px-3 py-1.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded hover:bg-black/20 text-white transition active:scale-95"
            title="Back to Workspace"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/20 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
            <span>Outlook</span>
          </div>
          <span className="text-xs sm:text-sm font-semibold truncate">
            {activeSection === "mail" ? "Mailbox" : activeSection === "calendar" ? "Calendar & Events" : "Contacts Directory"}
          </span>
        </div>

        {/* Navigation Toggles (Mail, Calendar, Contacts) */}
        <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveSection("mail")}
            className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
              activeSection === "mail" ? "bg-white text-[#0078D4] shadow-xs" : "text-white hover:bg-white/10"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mail</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("calendar")}
            className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
              activeSection === "calendar" ? "bg-white text-[#0078D4] shadow-xs" : "text-white hover:bg-white/10"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("contacts")}
            className={`px-3 py-1 rounded transition flex items-center gap-1.5 ${
              activeSection === "contacts" ? "bg-white text-[#0078D4] shadow-xs" : "text-white hover:bg-white/10"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Contacts</span>
          </button>
        </div>
      </header>

      {/* 2. NOTIFICATION TOAST */}
      {statusMessage && (
        <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 text-xs text-sky-800 flex items-center justify-between shrink-0 font-medium">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#0078D4]" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-sky-600 hover:text-sky-900 font-bold">
            ×
          </button>
        </div>
      )}

      {/* 3. MAIL SECTION */}
      {activeSection === "mail" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Folders Sidebar */}
          <aside className="w-48 border-r border-neutral-200 bg-[#F9FAFB] p-3 flex flex-col justify-between shrink-0">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setIsComposing(true)}
                className="w-full mb-3 py-2 px-3 rounded-xl bg-[#0078D4] hover:bg-[#006bbd] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Mail</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFolder("inbox")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeFolder === "inbox" ? "bg-[#0078D4]/15 text-[#0078D4]" : "text-neutral-600 hover:bg-neutral-200/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4" />
                  <span>Inbox</span>
                </div>
                <span className="text-[10px] bg-neutral-200 px-1.5 py-0.2 rounded-full font-bold">
                  {emails.filter((e) => e.folder === "inbox").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFolder("sent")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeFolder === "sent" ? "bg-[#0078D4]/15 text-[#0078D4]" : "text-neutral-600 hover:bg-neutral-200/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>Sent</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {emails.filter((e) => e.folder === "sent").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFolder("drafts")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeFolder === "drafts" ? "bg-[#0078D4]/15 text-[#0078D4]" : "text-neutral-600 hover:bg-neutral-200/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Drafts</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">
                  {emails.filter((e) => e.folder === "drafts").length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFolder("archive")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  activeFolder === "archive" ? "bg-[#0078D4]/15 text-[#0078D4]" : "text-neutral-600 hover:bg-neutral-200/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  <span>Archive</span>
                </div>
              </button>
            </div>

            <div className="pt-3 border-t border-neutral-200 text-[10px] text-neutral-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>TLS & OAuth Encrypted</span>
            </div>
          </aside>

          {/* Email List Column */}
          <div className="w-80 border-r border-neutral-200 flex flex-col bg-white shrink-0">
            <div className="p-2.5 border-b border-neutral-200">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emails..."
                  className="w-full pl-8 pr-3 py-1.5 bg-neutral-100 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#0078D4]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
              {emails
                .filter((e) => e.folder === activeFolder)
                .map((m) => {
                  const isSelected = m.id === selectedEmailId;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedEmailId(m.id)}
                      className={`p-3 cursor-pointer transition ${
                        isSelected ? "bg-sky-50/80 border-l-4 border-[#0078D4]" : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 mb-1">
                        <span className="truncate">{m.from.name}</span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-neutral-800 truncate mb-1">{m.subject}</p>
                      <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">{m.body}</p>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Email Preview & Action Column */}
          <div className="flex-1 flex flex-col bg-[#FFFFFF] overflow-y-auto">
            {selectedEmail ? (
              <div className="p-6 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-start justify-between border-b border-neutral-200 pb-4 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-neutral-900 mb-1">{selectedEmail.subject}</h2>
                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="font-semibold text-neutral-800">{selectedEmail.from.name}</span>
                        <span>&lt;{selectedEmail.from.email}&gt;</span>
                        <span>•</span>
                        <span>{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* AI Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAiSummarizeThread}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#0078D4] border border-sky-200 hover:bg-sky-100 text-xs font-semibold flex items-center gap-1 active:scale-95"
                        title="AI Summarize"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Summarize</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAiExtractActionItems}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#0078D4] border border-sky-200 hover:bg-sky-100 text-xs font-semibold flex items-center gap-1 active:scale-95"
                        title="Extract Action Items"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Tasks</span>
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap font-sans">
                    {selectedEmail.body}
                  </div>
                </div>

                {/* Quick Reply Bar */}
                <div className="pt-6 border-t border-neutral-200 mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setComposeTo(selectedEmail.from.email);
                      setComposeSubject(`Re: ${selectedEmail.subject}`);
                      setIsComposing(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0078D4] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#006bbd] transition active:scale-95 shadow-sm"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-400 text-xs">
                Select an email to read
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. CALENDAR SECTION */}
      {activeSection === "calendar" && (
        <div className="flex-1 p-6 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Workspace Calendar</h2>
                <p className="text-xs text-neutral-500">Schedule meetings, track deliverables, and manage reminders.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const title = prompt("Event title:", "Technical Architecture Review");
                  if (title) {
                    const newEvt: OutlookEvent = {
                      id: `evt_${Date.now()}`,
                      title,
                      startTime: new Date().toISOString(),
                      endTime: new Date(Date.now() + 3600000).toISOString(),
                      isAllDay: false,
                      recurring: "none",
                      reminderMinutes: 15,
                      attendees: ["gowtham@tattva.ai"],
                      color: "#0078D4",
                    };
                    setEvents((prev) => [...prev, newEvt]);
                    setStatusMessage("Event added to calendar! ✓");
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-[#0078D4] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#006bbd] transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Event</span>
              </button>
            </div>

            {/* Event Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col justify-between"
                  style={{ borderLeftWidth: "6px", borderLeftColor: evt.color }}
                >
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 mb-1">{evt.title}</h3>
                    <p className="text-xs text-neutral-500 mb-2">{evt.description || "No description provided."}</p>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#0078D4]" />
                        {new Date(evt.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {evt.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          {evt.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Reminder: {evt.reminderMinutes}m before</span>
                    <span className="font-semibold text-[#0078D4]">{evt.recurring !== "none" ? `Recurring (${evt.recurring})` : "One-time"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. CONTACTS SECTION */}
      {activeSection === "contacts" && (
        <div className="flex-1 p-6 overflow-y-auto bg-[#F8FAFC]">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Team & Client Contacts</h2>
                <p className="text-xs text-neutral-500">Secure directory with phone, email, and department tags.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const name = prompt("Contact name:");
                  const email = prompt("Contact email:");
                  if (name && email) {
                    setContacts((prev) => [
                      ...prev,
                      {
                        id: `cnt_${Date.now()}`,
                        name,
                        email,
                        group: "General",
                        isFavorite: false,
                      },
                    ]);
                    setStatusMessage("Contact saved! ✓");
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-[#0078D4] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#006bbd] transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add Contact</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {contacts.map((cnt) => (
                <div key={cnt.id} className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-full bg-[#0078D4]/15 text-[#0078D4] font-bold flex items-center justify-center text-sm">
                        {cnt.name.charAt(0)}
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        {cnt.group}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-neutral-900">{cnt.name}</h3>
                    <p className="text-xs text-neutral-500 font-medium">{cnt.jobTitle || "Team Member"}</p>
                    <p className="text-xs text-sky-600 font-mono mt-2 truncate">{cnt.email}</p>
                    {cnt.phone && <p className="text-[11px] text-neutral-400 font-mono">{cnt.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. COMPOSE EMAIL MODAL */}
      {isComposing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-300 w-full max-w-xl p-6 select-none animate-fadeIn flex flex-col justify-between min-h-[460px]">
            <div>
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
                <h3 className="font-bold text-base text-neutral-900">New Message</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiDraft}
                    disabled={aiGenerating}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#0078D4] border border-sky-200 hover:bg-sky-100 text-xs font-semibold flex items-center gap-1 active:scale-95"
                    title="Generate Draft with AI"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiGenerating ? "Drafting..." : "AI Draft"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    className="text-neutral-400 hover:text-neutral-700 font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="To: recipient@tattva.ai"
                  className="w-full p-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0078D4]"
                />

                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject: ..."
                  className="w-full p-2 border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0078D4] font-semibold"
                />

                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  rows={8}
                  placeholder="Write message..."
                  className="w-full p-2.5 border border-neutral-300 rounded-lg focus:outline-none focus:border-[#0078D4] resize-none font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-200 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">Status: Ready to send</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="px-3.5 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-medium"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSendEmail}
                  className="px-4 py-2 rounded-xl bg-[#0078D4] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#006bbd] transition active:scale-95 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

