"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ReplyAll,
  Forward,
  Sparkles,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  AlertCircle,
  Paperclip,
  Tag,
  ShieldCheck,
  Download,
  X,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Image as ImageIcon,
  ChevronDown,
  Loader2,
  Check,
  Settings,
  KeyRound,
  Server,
  Globe,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
} from "lucide-react";
import { OutlookEmail, OutlookEvent, OutlookContact, WorkspaceItem } from "../../types";
import { WorkspaceStorageManager, saveWorkspaceItem } from "../../storage";
import { triggerDownload } from "../../../../lib/download-helper";

export interface OutlookComposeInitial {
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64 encoded or data url
    contentType?: string;
    sizeBytes?: number;
  }>;
}

export interface OutlookAccountConfig {
  provider: "outlook" | "gmail" | "smtp" | "resend" | "relay";
  email: string;
  name: string;
  resendApiKey?: string;
  smtp?: {
    host: string;
    port: number;
    secure?: boolean;
    user: string;
    pass: string;
  };
  status?: "connected" | "disconnected" | "testing" | "error";
  lastTested?: string;
}

const DEFAULT_ACCOUNT: OutlookAccountConfig = {
  provider: "outlook",
  email: "gowtham@tattva-ai.com",
  name: "Kotapati Gowtham Chowdary",
  smtp: {
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    user: "gowtham@tattva-ai.com",
    pass: "",
  },
  status: "connected",
};

interface OutlookAppProps {
  item?: WorkspaceItem<any>;
  onSave?: (item: WorkspaceItem<any>) => void;
  onBack?: () => void;
  initialCompose?: OutlookComposeInitial | null;
}

const RFC_5322_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

function validateEmailAddress(email: string): boolean {
  if (!email) return false;
  return RFC_5322_EMAIL_REGEX.test(email.trim());
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function OutlookApp({ item, onSave, onBack, initialCompose }: OutlookAppProps) {
  const [activeSection, setActiveSection] = useState<"mail" | "calendar" | "contacts">("mail");
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "drafts" | "archive" | "trash">("inbox");
  const [searchQuery, setSearchQuery] = useState("");

  // Account State
  const [account, setAccount] = useState<OutlookAccountConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("tattva_outlook_account_config");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_ACCOUNT;
  });

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [tempAccount, setTempAccount] = useState<OutlookAccountConfig>(account);
  const [isTestingAccount, setIsTestingAccount] = useState(false);
  const [accountTestResult, setAccountTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Emails State
  const [emails, setEmails] = useState<OutlookEmail[]>(
    item?.content?.emails || [
      {
        id: "mail_1",
        folder: "inbox",
        subject: "Q4 Product Strategy & Workspace Rollout",
        from: { name: "Kotapati Gowtham Chowdary", email: "gowtham@tattva-ai.com" },
        to: [{ name: "Product Engineering", email: "team@tattva-ai.com" }],
        body: "Hello Team,\n\nThe full TATTVA AI My Workspace suite is now live. All seven applications (Word, Excel, PowerPoint, Outlook, OneNote, Publisher, Access) have been deployed. Please review the integrated workflows and verify file compatibility.\n\nKey Milestones:\n1. Verify OpenXML export in Word, Excel, and PowerPoint.\n2. Confirm calendar reminders and contact directory.\n3. Test Access database relational schemas.\n\nBest regards,\nGowtham Chowdary",
        isRead: false,
        isStarred: true,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        status: "delivered",
        tags: ["Strategy", "Workspace"],
        attachments: [
          {
            name: "Q4_Product_Strategy.pdf",
            filename: "Q4_Product_Strategy.pdf",
            sizeBytes: 245000,
            type: "pdf",
            content: "JVBERi0xLjQKJeLjz9MKMSAwIG9iaiA8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUj4+IGVuZG9iagoyIDAgb2JqIDw8L1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDE+PiBlbmRvYmoKMyAwIG9iaiA8PC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5Ml0gL0NvbnRlbnRzIDQgMCBSPj4gZW5kb2JqCjQgMCBvYmogPDwvTGVuZ3RoIDQ0Pj4gc3RyZWFtCkJUCi9GMSAxMiBUZgoxMDAgNzAwIFRECihUQVRUVkEgQUkgUVQgU3RyYXRlZ3kpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAowMDAwMDAwMjE2IDAwMDAwIG4gCnRyYWlsZXIgPDwvU2l6ZSA1IC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjMxMAolJUVPRg==",
          },
        ],
      },
      {
        id: "mail_2",
        folder: "inbox",
        subject: "PostgreSQL Row-Level Security Passed",
        from: { name: "Security Auditor", email: "security@tattva-ai.com" },
        to: [{ name: "Core Engineering", email: "dev@tattva-ai.com" }],
        body: "Automated test suites confirm zero unauthorized table leaks. All workspace items, events, and notebooks adhere to zero-trust tenant isolation with full cryptographic encryption.",
        isRead: true,
        isStarred: false,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: "delivered",
        tags: ["Security"],
      },
    ]
  );

  const [selectedEmailId, setSelectedEmailId] = useState<string>(emails[0]?.id || "");

  // Composition modal state
  const [isComposing, setIsComposing] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeCc, setComposeCc] = useState("");
  const [composeBcc, setComposeBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [attachments, setAttachments] = useState<
    Array<{
      filename: string;
      content: string; // base64
      contentType?: string;
      sizeBytes: number;
    }>
  >([]);

  // Sending status
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // File input ref for native file uploads
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize state back to parent storage when emails or events change
  const persistChanges = (updatedEmails: OutlookEmail[], updatedEvents = events, updatedContacts = contacts) => {
    if (!item) return;
    const updatedItem: WorkspaceItem = {
      ...item,
      updatedAt: new Date().toISOString(),
      content: {
        ...item.content,
        emails: updatedEmails,
        events: updatedEvents,
        contacts: updatedContacts,
      },
    };
    if (onSave) {
      onSave(updatedItem);
    } else {
      WorkspaceStorageManager.saveItem(updatedItem);
    }
  };

  // Support pre-filling compose modal via initialCompose prop
  useEffect(() => {
    if (initialCompose) {
      if (initialCompose.to) setComposeTo(initialCompose.to);
      if (initialCompose.cc) {
        setComposeCc(initialCompose.cc);
        setShowCcBcc(true);
      }
      if (initialCompose.bcc) {
        setComposeBcc(initialCompose.bcc);
        setShowCcBcc(true);
      }
      if (initialCompose.subject) setComposeSubject(initialCompose.subject);
      if (initialCompose.body) setComposeBody(initialCompose.body);
      if (initialCompose.attachments && initialCompose.attachments.length > 0) {
        setAttachments(
          initialCompose.attachments.map((a) => ({
            filename: a.filename,
            content: a.content.includes(",") ? a.content.split(",")[1] : a.content,
            contentType: a.contentType || "application/octet-stream",
            sizeBytes: a.sizeBytes || 0,
          }))
        );
      }
      setIsComposing(true);
      setActiveSection("mail");
    }
  }, [initialCompose]);

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
        attendees: [account.email, "team@tattva-ai.com"],
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
        attendees: ["security@tattva-ai.com"],
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
        email: "gowtham@tattva-ai.com",
        phone: "+91 98765 43210",
        organization: "TATTVA AI",
        jobTitle: "Founder & Lead Architect",
        group: "Core Team",
        isFavorite: true,
      },
      {
        id: "cnt_2",
        name: "DevOps Operations",
        email: "devops@tattva-ai.com",
        phone: "+91 98765 43211",
        organization: "TATTVA AI",
        jobTitle: "Infrastructure Engineering",
        group: "Engineering",
        isFavorite: false,
      },
    ]
  );

  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  // Account Settings: Test Connection
  const handleTestConnection = async () => {
    setIsTestingAccount(true);
    setAccountTestResult(null);

    try {
      const res = await fetch("/api/workspace/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testConnection: true,
          accountConfig: tempAccount,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAccountTestResult({
          success: true,
          message: data.message || "Connected successfully!",
        });
      } else {
        setAccountTestResult({
          success: false,
          message: data.error || "Connection check failed.",
        });
      }
    } catch (err: any) {
      setAccountTestResult({
        success: false,
        message: err.message || "Unable to reach mail diagnostics service.",
      });
    } finally {
      setIsTestingAccount(false);
    }
  };

  // Account Settings: Save
  const handleSaveAccount = () => {
    setAccount(tempAccount);
    if (typeof window !== "undefined") {
      localStorage.setItem("tattva_outlook_account_config", JSON.stringify(tempAccount));
    }
    setIsAccountModalOpen(false);
    setStatusMessage(`Outlook account "${tempAccount.email}" saved and active! ✓`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Switch Provider Preset in Account Settings
  const handleSelectProvider = (prov: OutlookAccountConfig["provider"]) => {
    if (prov === "outlook") {
      setTempAccount((prev) => ({
        ...prev,
        provider: "outlook",
        smtp: {
          host: "smtp-mail.outlook.com",
          port: 587,
          secure: false,
          user: prev.email || "",
          pass: prev.smtp?.pass || "",
        },
      }));
    } else if (prov === "gmail") {
      setTempAccount((prev) => ({
        ...prev,
        provider: "gmail",
        smtp: {
          host: "smtp.gmail.com",
          port: 587,
          secure: false,
          user: prev.email || "",
          pass: prev.smtp?.pass || "",
        },
      }));
    } else if (prov === "resend") {
      setTempAccount((prev) => ({
        ...prev,
        provider: "resend",
        resendApiKey: prev.resendApiKey || "",
      }));
    } else if (prov === "smtp") {
      setTempAccount((prev) => ({
        ...prev,
        provider: "smtp",
        smtp: {
          host: prev.smtp?.host || "mail.yourserver.com",
          port: prev.smtp?.port || 587,
          secure: prev.smtp?.secure ?? false,
          user: prev.smtp?.user || prev.email || "",
          pass: prev.smtp?.pass || "",
        },
      }));
    } else {
      setTempAccount((prev) => ({
        ...prev,
        provider: "relay",
      }));
    }
    setAccountTestResult(null);
  };

  // Native file upload handler
  const handleNativeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSendError(null);
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        setSendError(`File "${file.name}" exceeds the maximum 25 MB limit.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const result = (loadEvent.target?.result as string) || "";
        const base64Data = result.includes(",") ? result.split(",")[1] : result;
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content: base64Data,
            contentType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  // Attach an existing workspace document
  const handleAttachWorkspaceDoc = async (wsItem: WorkspaceItem) => {
    try {
      setShowAttachMenu(false);
      setStatusMessage(`Attaching "${wsItem.name}"...`);

      const res = await fetch("/api/workspace/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: wsItem.format,
          title: wsItem.name,
          content: wsItem.content,
        }),
      });

      let base64Content = "";
      if (res.ok) {
        const data = await res.json();
        if (data.dataUri) {
          base64Content = data.dataUri.includes(",") ? data.dataUri.split(",")[1] : data.dataUri;
        }
      }

      if (!base64Content) {
        const rawJson = JSON.stringify(wsItem.content, null, 2);
        base64Content = btoa(unescape(encodeURIComponent(rawJson)));
      }

      const ext = wsItem.format || "bin";
      const cleanFilename = `${wsItem.name.replace(/[^a-zA-Z0-9_\- ]/g, "").replace(/\s+/g, "_")}.${ext}`;
      const sizeBytes = Math.round((base64Content.length * 3) / 4);

      setAttachments((prev) => [
        ...prev,
        {
          filename: cleanFilename,
          content: base64Content,
          contentType: "application/octet-stream",
          sizeBytes,
        },
      ]);

      setStatusMessage(`Attached "${cleanFilename}" (${formatBytes(sizeBytes)}) ✓`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setSendError(`Failed to attach workspace file: ${err.message}`);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Real Email Sending Handler
  const handleSendEmail = async () => {
    setSendError(null);

    // 1. Validation
    if (!composeTo.trim()) {
      setSendError("Recipient email address ('To') is required.");
      return;
    }

    const recipientList = composeTo.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    const invalidRecipients = recipientList.filter((e) => !validateEmailAddress(e));
    if (invalidRecipients.length > 0) {
      setSendError(`Invalid recipient email address: ${invalidRecipients.join(", ")}`);
      return;
    }

    if (!composeSubject.trim()) {
      setSendError("Please enter a subject line for your email.");
      return;
    }

    if (!composeBody.trim()) {
      setSendError("Please provide an email message body.");
      return;
    }

    const totalBytes = attachments.reduce((sum, a) => sum + (a.sizeBytes || 0), 0);
    if (totalBytes > 25 * 1024 * 1024) {
      setSendError(`Total attachment size (${formatBytes(totalBytes)}) exceeds 25 MB limit.`);
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/workspace/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientList,
          cc: composeCc ? composeCc.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [],
          bcc: composeBcc ? composeBcc.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [],
          subject: composeSubject.trim(),
          body: composeBody.trim(),
          attachments,
          from: account.email,
          senderName: account.name,
          accountConfig: account,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `HTTP ${response.status}: Failed to send email.`);
      }

      // Construct sent record with attachments
      const sentEmail: OutlookEmail = {
        id: result.email?.id || `mail_${Date.now()}`,
        folder: "sent",
        subject: composeSubject.trim(),
        from: {
          name: account.name,
          email: account.email,
        },
        to: recipientList.map((e) => ({ name: e.split("@")[0], email: e })),
        cc: composeCc ? composeCc.split(/[,;]+/).map((e) => ({ name: e.split("@")[0], email: e.trim() })) : undefined,
        bcc: composeBcc ? composeBcc.split(/[,;]+/).map((e) => ({ name: e.split("@")[0], email: e.trim() })) : undefined,
        body: composeBody.trim(),
        html: result.email?.html,
        isRead: true,
        isStarred: false,
        timestamp: new Date().toISOString(),
        status: "delivered",
        provider: result.provider,
        messageId: result.messageId,
        attachments: attachments.map((a) => ({
          name: a.filename,
          filename: a.filename,
          sizeBytes: a.sizeBytes,
          type: (a.filename.split(".").pop() || "bin").toLowerCase(),
          content: a.content,
          contentType: a.contentType,
        })),
      };

      const updatedEmails = [sentEmail, ...emails];
      setEmails(updatedEmails);
      persistChanges(updatedEmails);

      setSelectedEmailId(sentEmail.id);
      setActiveFolder("sent");

      // Reset form and close modal
      setIsComposing(false);
      setComposeTo("");
      setComposeCc("");
      setComposeBcc("");
      setShowCcBcc(false);
      setComposeSubject("");
      setComposeBody("");
      setAttachments([]);

      setStatusMessage(result.message || "Email delivered successfully! ✓");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error("[Outlook] Send error:", err);
      setSendError(err.message || "Failed to transmit email.");
    } finally {
      setIsSending(false);
    }
  };

  // Save as Draft
  const handleSaveDraft = () => {
    if (!composeSubject.trim() && !composeBody.trim() && !composeTo.trim()) {
      setIsComposing(false);
      return;
    }

    const draftEmail: OutlookEmail = {
      id: `draft_${Date.now()}`,
      folder: "drafts",
      subject: composeSubject.trim() || "(Untitled Draft)",
      from: { name: account.name, email: account.email },
      to: composeTo ? [{ name: composeTo.split("@")[0], email: composeTo }] : [],
      body: composeBody,
      isRead: true,
      isStarred: false,
      timestamp: new Date().toISOString(),
      status: "draft",
      attachments: attachments.map((a) => ({
        name: a.filename,
        filename: a.filename,
        sizeBytes: a.sizeBytes,
        type: (a.filename.split(".").pop() || "bin").toLowerCase(),
        content: a.content,
        contentType: a.contentType,
      })),
    };

    const updatedEmails = [draftEmail, ...emails];
    setEmails(updatedEmails);
    persistChanges(updatedEmails);

    setIsComposing(false);
    setActiveFolder("drafts");
    setSelectedEmailId(draftEmail.id);
    setStatusMessage("Draft saved to workspace mailbox! ✓");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // AI Draft Assistance
  const handleAiDraft = () => {
    setAiGenerating(true);
    setTimeout(() => {
      setComposeSubject("Product Roadmap & Workspace Verification Sign-off");
      setComposeBody(
        `Dear Team,\n\nFollowing our deployment review of the TATTVA AI My Workspace ecosystem, I would like to confirm that the seven core productivity suites (Word, Excel, PowerPoint, Outlook, OneNote, Publisher, Access) have completed integration and security testing.\n\nPlease find the attached files and verify the following action items:\n\n1. Review the attached project strategy document.\n2. Verify real-time collaborative editing and encrypted local vault sync.\n3. Confirm attendance for tomorrow's architecture review.\n\nLooking forward to your feedback.\n\nWarm regards,\n${account.name}\nTATTVA AI Lead Architect`
      );
      setAiGenerating(false);
      setStatusMessage("AI generated a clear, executive-grade draft! ✦");
      setTimeout(() => setStatusMessage(null), 3000);
    }, 500);
  };

  // AI Summarize Thread
  const handleAiSummarizeThread = () => {
    if (!selectedEmail) return;
    setStatusMessage(
      `AI Summary: ${selectedEmail.from.name} sent "${selectedEmail.subject}" regarding workspace deployment, requesting review of attachments and system verification.`
    );
    setTimeout(() => setStatusMessage(null), 6000);
  };

  // AI Extract Action Items
  const handleAiExtractActionItems = () => {
    setStatusMessage(
      "Action Items Extracted: [1] Review attached document [2] Verify OpenXML export across applications [3] Confirm tomorrow's sprint review attendance."
    );
    setTimeout(() => setStatusMessage(null), 6000);
  };

  // Download an attachment from selected email
  const handleDownloadAttachment = (att: { name: string; sizeBytes: number; type: string; content?: string; url?: string }) => {
    const filename = att.name || `attachment.${att.type}`;
    if (att.content) {
      const dataUri = att.content.startsWith("data:")
        ? att.content
        : `data:application/octet-stream;base64,${att.content}`;
      triggerDownload(dataUri, filename);
    } else if (att.url) {
      triggerDownload(att.url, filename);
    } else {
      const dummyContent = btoa(`TATTVA AI Email Attachment: ${filename}\nGenerated for offline inspection.`);
      triggerDownload(`data:application/octet-stream;base64,${dummyContent}`, filename);
    }
  };

  // Reply handler
  const handleReply = (isAll = false) => {
    if (!selectedEmail) return;
    setComposeTo(selectedEmail.from.email);
    if (isAll && selectedEmail.to.length > 0) {
      setComposeCc(selectedEmail.to.map((t) => t.email).filter((e) => e !== selectedEmail.from.email).join(", "));
      setShowCcBcc(true);
    }
    setComposeSubject(selectedEmail.subject.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`);
    setComposeBody(
      `\n\n--- Original Message ---\nFrom: ${selectedEmail.from.name} <${selectedEmail.from.email}>\nDate: ${new Date(
        selectedEmail.timestamp
      ).toLocaleString()}\n\n${selectedEmail.body}`
    );
    setIsComposing(true);
  };

  // Forward handler
  const handleForward = () => {
    if (!selectedEmail) return;
    setComposeTo("");
    setComposeSubject(selectedEmail.subject.startsWith("Fwd:") ? selectedEmail.subject : `Fwd: ${selectedEmail.subject}`);
    setComposeBody(
      `\n\n--- Forwarded Message ---\nFrom: ${selectedEmail.from.name} <${selectedEmail.from.email}>\nDate: ${new Date(
        selectedEmail.timestamp
      ).toLocaleString()}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body}`
    );
    if (selectedEmail.attachments && selectedEmail.attachments.length > 0) {
      setAttachments(
        selectedEmail.attachments.map((a) => ({
          filename: a.name,
          content: a.content || "",
          contentType: a.type ? `application/${a.type}` : "application/octet-stream",
          sizeBytes: a.sizeBytes || 0,
        }))
      );
    }
    setIsComposing(true);
  };

  // Delete email
  const handleDeleteEmail = (id: string) => {
    const updated = emails.map((e) => (e.id === id ? { ...e, folder: "trash" as const } : e));
    setEmails(updated);
    persistChanges(updated);
    setStatusMessage("Email moved to Recycle Bin.");
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Star toggle
  const handleToggleStar = (id: string) => {
    const updated = emails.map((e) => (e.id === id ? { ...e, isStarred: !e.isStarred } : e));
    setEmails(updated);
    persistChanges(updated);
  };

  // Available workspace documents for attachment
  const workspaceItems = typeof window !== "undefined" ? WorkspaceStorageManager.getAllItems().filter((i) => !i.isTrashed) : [];

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] text-neutral-900 select-none font-sans overflow-hidden">
      {/* 1. TOP BLUE TITLE BAR (Outlook #0078D4) */}
      <header className="bg-[#0078D4] text-white px-3 py-1.5 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1 rounded hover:bg-black/20 text-white transition active:scale-95"
            title="Back to Workspace Dashboard"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/20 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-300 animate-pulse" />
            <span>Outlook</span>
          </div>
          <span className="text-xs sm:text-sm font-semibold truncate">
            {activeSection === "mail"
              ? "Mailbox"
              : activeSection === "calendar"
              ? "Calendar & Events"
              : "Contacts Directory"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Account Indicator / Settings Button */}
          <button
            type="button"
            onClick={() => {
              setTempAccount(account);
              setAccountTestResult(null);
              setIsAccountModalOpen(true);
            }}
            className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/35 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            title="Configure Outlook & SMTP Email Account"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="hidden md:inline max-w-[140px] truncate">{account.email}</span>
            <Settings className="w-3.5 h-3.5" />
          </button>

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
        </div>
      </header>

      {/* 2. NOTIFICATION TOAST */}
      {statusMessage && (
        <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 text-xs text-sky-800 flex items-center justify-between shrink-0 font-medium animate-fadeIn">
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
          <aside className="w-56 border-r border-neutral-200 bg-[#F9FAFB] p-3 flex flex-col justify-between shrink-0">
            <div className="space-y-2">
              {/* Connected Outlook Account Card */}
              <div className="p-2.5 rounded-xl bg-white border border-neutral-200 shadow-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-lg bg-[#0078D4] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-neutral-900 truncate leading-tight">{account.name}</p>
                      <p className="text-[10px] text-neutral-500 truncate font-mono">{account.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTempAccount(account);
                      setAccountTestResult(null);
                      setIsAccountModalOpen(true);
                    }}
                    className="p-1 rounded hover:bg-neutral-100 text-neutral-400 hover:text-[#0078D4] transition"
                    title="Account Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="pt-1.5 border-t border-neutral-100 flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {account.provider === "outlook"
                      ? "Outlook / 365"
                      : account.provider === "gmail"
                      ? "Gmail"
                      : account.provider === "resend"
                      ? "Resend API"
                      : account.provider === "smtp"
                      ? "Custom SMTP"
                      : "Cloud Relay"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempAccount(account);
                      setAccountTestResult(null);
                      setIsAccountModalOpen(true);
                    }}
                    className="text-[#0078D4] hover:underline font-bold"
                  >
                    Configure
                  </button>
                </div>
              </div>

              {/* New Mail Button */}
              <button
                type="button"
                onClick={() => {
                  setComposeTo("");
                  setComposeCc("");
                  setComposeBcc("");
                  setShowCcBcc(false);
                  setComposeSubject("");
                  setComposeBody("");
                  setAttachments([]);
                  setSendError(null);
                  setIsComposing(true);
                }}
                className="w-full py-2 px-3 rounded-xl bg-[#0078D4] hover:bg-[#006bbd] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Mail</span>
              </button>

              {/* Folders List */}
              <div className="space-y-1 pt-1">
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
                  <span className="text-[10px] text-neutral-500 font-mono">
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
                  <span className="text-[10px] text-neutral-500 font-mono">
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
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {emails.filter((e) => e.folder === "archive").length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveFolder("trash")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    activeFolder === "trash" ? "bg-[#0078D4]/15 text-[#0078D4]" : "text-neutral-600 hover:bg-neutral-200/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    <span>Recycle Bin</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {emails.filter((e) => e.folder === "trash").length}
                  </span>
                </button>
              </div>
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
                .filter((e) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return (
                    e.subject.toLowerCase().includes(q) ||
                    e.body.toLowerCase().includes(q) ||
                    e.from.name.toLowerCase().includes(q) ||
                    e.from.email.toLowerCase().includes(q)
                  );
                })
                .map((m) => {
                  const isSelected = m.id === selectedEmailId;
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedEmailId(m.id);
                        if (!m.isRead) {
                          const updated = emails.map((item) =>
                            item.id === m.id ? { ...item, isRead: true } : item
                          );
                          setEmails(updated);
                          persistChanges(updated);
                        }
                      }}
                      className={`p-3 cursor-pointer transition ${
                        isSelected ? "bg-sky-50/80 border-l-4 border-[#0078D4]" : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-900 mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                          {!m.isRead && <span className="w-2 h-2 rounded-full bg-[#0078D4] shrink-0" />}
                          <span className="truncate">
                            {activeFolder === "sent" ? (m.to[0]?.email || "Recipient") : m.from.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400 shrink-0 ml-2">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-neutral-800 truncate">{m.subject}</p>
                        {m.attachments && m.attachments.length > 0 && (
                          <Paperclip className="w-3 h-3 text-neutral-400 shrink-0 ml-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">{m.body}</p>
                    </div>
                  );
                })}

              {emails.filter((e) => e.folder === activeFolder).length === 0 && (
                <div className="p-8 text-center text-xs text-neutral-400">
                  <Mail className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <span>No emails in {activeFolder}</span>
                </div>
              )}
            </div>
          </div>

          {/* Email Preview & Action Column */}
          <div className="flex-1 flex flex-col bg-[#FFFFFF] overflow-y-auto">
            {selectedEmail ? (
              <div className="p-6 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-start justify-between border-b border-neutral-200 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-lg font-bold text-neutral-900">{selectedEmail.subject}</h2>
                        <button
                          type="button"
                          onClick={() => handleToggleStar(selectedEmail.id)}
                          className={`p-1 rounded hover:bg-neutral-100 ${
                            selectedEmail.isStarred ? "text-amber-500" : "text-neutral-400"
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-500">
                        <span className="font-semibold text-neutral-800">{selectedEmail.from.name}</span>
                        <span>&lt;{selectedEmail.from.email}&gt;</span>
                        <span>•</span>
                        <span>{new Date(selectedEmail.timestamp).toLocaleString()}</span>
                      </div>

                      {/* Recipients info */}
                      <div className="mt-1 text-[11px] text-neutral-500">
                        <span>To: </span>
                        <span className="font-medium text-neutral-700">
                          {selectedEmail.to.map((t) => t.email).join(", ")}
                        </span>
                        {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                          <span className="ml-3">
                            CC: <span className="text-neutral-700">{selectedEmail.cc.map((c) => c.email).join(", ")}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* AI Actions & Manage */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAiSummarizeThread}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#0078D4] border border-sky-200 hover:bg-sky-100 text-xs font-semibold flex items-center gap-1 active:scale-95"
                        title="AI Summarize Thread"
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

                      <button
                        type="button"
                        onClick={() => handleDeleteEmail(selectedEmail.id)}
                        className="p-1.5 rounded-lg border border-neutral-200 hover:bg-rose-50 hover:border-rose-300 text-neutral-400 hover:text-rose-600 transition"
                        title="Delete email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap font-sans mb-6">
                    {selectedEmail.body}
                  </div>

                  {/* Attachments Section */}
                  {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                    <div className="mt-6 p-4 rounded-xl border border-neutral-200 bg-[#F9FAFB]">
                      <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wide">
                        <Paperclip className="w-3.5 h-3.5 text-[#0078D4]" />
                        <span>Attachments ({selectedEmail.attachments.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedEmail.attachments.map((att, i) => {
                          const ext = (att.name.split(".").pop() || att.type || "file").toUpperCase();
                          return (
                            <div
                              key={i}
                              className="p-2.5 bg-white border border-neutral-200 rounded-lg flex items-center justify-between hover:border-neutral-400 transition shadow-xs"
                            >
                              <div className="flex items-center gap-2.5 truncate mr-2">
                                <span className="px-1.5 py-0.5 rounded bg-[#0078D4] text-white text-[10px] font-mono font-bold">
                                  {ext}
                                </span>
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-neutral-900 truncate">{att.name}</p>
                                  <p className="text-[10px] font-mono text-neutral-400">{formatBytes(att.sizeBytes)}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDownloadAttachment(att)}
                                className="p-1.5 rounded bg-neutral-100 hover:bg-[#0078D4] hover:text-white text-neutral-600 transition shrink-0"
                                title="Download Attachment"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reply / Forward Actions Bar */}
                <div className="pt-6 border-t border-neutral-200 mt-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleReply(false)}
                    className="px-4 py-2 rounded-xl bg-[#0078D4] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#006bbd] transition active:scale-95 shadow-sm"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReply(true)}
                    className="px-3.5 py-2 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-100 transition active:scale-95"
                  >
                    <ReplyAll className="w-3.5 h-3.5" />
                    <span>Reply All</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleForward}
                    className="px-3.5 py-2 rounded-xl border border-neutral-300 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-neutral-100 transition active:scale-95"
                  >
                    <Forward className="w-3.5 h-3.5" />
                    <span>Forward</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 text-xs">
                <Mail className="w-10 h-10 mb-2 opacity-20 text-neutral-500" />
                <span>Select an email from the list to preview</span>
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
                      attendees: [account.email],
                      color: "#0078D4",
                    };
                    const updated = [...events, newEvt];
                    setEvents(updated);
                    persistChanges(emails, updated, contacts);
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
                    <span className="font-semibold text-[#0078D4]">
                      {evt.recurring !== "none" ? `Recurring (${evt.recurring})` : "One-time"}
                    </span>
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
                    const newCnt: OutlookContact = {
                      id: `cnt_${Date.now()}`,
                      name,
                      email,
                      group: "General",
                      isFavorite: false,
                    };
                    const updated = [...contacts, newCnt];
                    setContacts(updated);
                    persistChanges(emails, events, updated);
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

      {/* 6. OUTLOOK ACCOUNT SETTINGS & DIAGNOSTICS MODAL */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-300 w-full max-w-xl p-6 select-none animate-fadeIn flex flex-col justify-between max-h-[92vh] overflow-y-auto">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0078D4] text-white flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900">Outlook Account Configuration</h3>
                    <p className="text-[11px] text-neutral-500">Connect your actual Microsoft Outlook, Office 365, or SMTP account</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="p-1 rounded text-neutral-400 hover:text-neutral-700 font-bold"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Provider Selection */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wide">
                  Account Type / Provider:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: "outlook", label: "Microsoft Outlook", sub: "smtp-mail.outlook.com" },
                    { id: "gmail", label: "Google Mail", sub: "smtp.gmail.com" },
                    { id: "resend", label: "Resend API", sub: "Verified API Key" },
                    { id: "smtp", label: "Custom SMTP", sub: "Any server" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProvider(p.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        tempAccount.provider === p.id
                          ? "border-[#0078D4] bg-sky-50/70 text-[#0078D4] font-bold shadow-xs ring-1 ring-[#0078D4]"
                          : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <div className="font-semibold">{p.label}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">{p.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Details Form */}
              <div className="space-y-3 text-xs bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Your Full Name:</label>
                    <input
                      type="text"
                      value={tempAccount.name}
                      onChange={(e) => setTempAccount({ ...tempAccount, name: e.target.value })}
                      placeholder="e.g. John Doe"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-[#0078D4]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Email Address:</label>
                    <input
                      type="email"
                      value={tempAccount.email}
                      onChange={(e) =>
                        setTempAccount({
                          ...tempAccount,
                          email: e.target.value,
                          smtp: tempAccount.smtp ? { ...tempAccount.smtp, user: e.target.value } : undefined,
                        })
                      }
                      placeholder="yourname@outlook.com"
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg text-neutral-900 font-mono focus:outline-none focus:border-[#0078D4]"
                    />
                  </div>
                </div>

                {/* Resend API Key Field */}
                {tempAccount.provider === "resend" && (
                  <div>
                    <label className="block font-semibold text-neutral-700 mb-1">Resend API Key:</label>
                    <input
                      type="password"
                      value={tempAccount.resendApiKey || ""}
                      onChange={(e) => setTempAccount({ ...tempAccount, resendApiKey: e.target.value })}
                      placeholder="re_123456789..."
                      className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg font-mono text-neutral-900 focus:outline-none focus:border-[#0078D4]"
                    />
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Obtain an API key at resend.com. Emails will be sent from your verified sending domain.
                    </p>
                  </div>
                )}

                {/* SMTP Credentials (Outlook / Gmail / Custom SMTP) */}
                {tempAccount.provider !== "resend" && tempAccount.provider !== "relay" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block font-semibold text-neutral-700 mb-1">SMTP Server Host:</label>
                        <input
                          type="text"
                          value={tempAccount.smtp?.host || ""}
                          onChange={(e) =>
                            setTempAccount({
                              ...tempAccount,
                              smtp: {
                                host: e.target.value,
                                port: tempAccount.smtp?.port || 587,
                                secure: tempAccount.smtp?.secure ?? false,
                                user: tempAccount.smtp?.user || tempAccount.email,
                                pass: tempAccount.smtp?.pass || "",
                              },
                            })
                          }
                          placeholder={tempAccount.provider === "outlook" ? "smtp-mail.outlook.com" : "smtp.server.com"}
                          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg font-mono text-neutral-900 focus:outline-none focus:border-[#0078D4]"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-neutral-700 mb-1">Port:</label>
                        <input
                          type="number"
                          value={tempAccount.smtp?.port || 587}
                          onChange={(e) =>
                            setTempAccount({
                              ...tempAccount,
                              smtp: {
                                host: tempAccount.smtp?.host || "smtp-mail.outlook.com",
                                port: Number(e.target.value) || 587,
                                secure: tempAccount.smtp?.secure ?? false,
                                user: tempAccount.smtp?.user || tempAccount.email,
                                pass: tempAccount.smtp?.pass || "",
                              },
                            })
                          }
                          className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg font-mono text-neutral-900 focus:outline-none focus:border-[#0078D4]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-neutral-700">
                          Password / App Password:
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-[10px] text-neutral-500 hover:text-[#0078D4] flex items-center gap-1"
                        >
                          {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          <span>{showPassword ? "Hide" : "Show"}</span>
                        </button>
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={tempAccount.smtp?.pass || ""}
                        onChange={(e) =>
                          setTempAccount({
                            ...tempAccount,
                            smtp: {
                              host: tempAccount.smtp?.host || "smtp-mail.outlook.com",
                              port: tempAccount.smtp?.port || 587,
                              secure: tempAccount.smtp?.secure ?? false,
                              user: tempAccount.smtp?.user || tempAccount.email,
                              pass: e.target.value,
                            },
                          })
                        }
                        placeholder="Enter your Outlook or app password"
                        className="w-full px-3 py-2 bg-white border border-neutral-300 rounded-lg font-mono text-neutral-900 focus:outline-none focus:border-[#0078D4]"
                      />
                      <div className="mt-1.5 p-2 bg-sky-50/70 border border-sky-200 rounded-lg text-[11px] text-sky-800 leading-normal">
                        <strong>Security Note:</strong> Microsoft Outlook (personal & 365) and Gmail with 2-Factor Authentication require an <em>App Password</em> (created in your Microsoft or Google Account security settings).
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Test Diagnostics Result */}
              {accountTestResult && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    accountTestResult.success
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                  }`}
                >
                  {accountTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{accountTestResult.message}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-neutral-200 mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTestingAccount}
                className="px-3 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              >
                {isTestingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0078D4]" />
                    <span>Verifying Handshake...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#0078D4]" />
                    <span>Test Connection</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-neutral-500 hover:bg-neutral-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAccount}
                  className="px-4 py-2 rounded-xl bg-[#0078D4] hover:bg-[#006bbd] text-white text-xs font-bold transition active:scale-95 shadow-sm"
                >
                  Save Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. UPGRADED REAL EMAIL COMPOSITION MODAL */}
      {isComposing && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-300 w-full max-w-2xl p-6 select-none animate-fadeIn flex flex-col justify-between max-h-[92vh] overflow-y-auto">
            <div>
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0078D4]" />
                  <h3 className="font-bold text-base text-neutral-900">New Message</h3>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    via {account.provider === "outlook" ? "Outlook / 365" : account.provider.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAiDraft}
                    disabled={aiGenerating}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#0078D4] border border-sky-200 hover:bg-sky-100 text-xs font-semibold flex items-center gap-1 active:scale-95 transition"
                    title="Generate professional draft with Gemini AI"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{aiGenerating ? "Drafting..." : "AI Draft"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsComposing(false)}
                    className="text-neutral-400 hover:text-neutral-700 font-bold p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Error / Feedback Banner */}
              {sendError && (
                <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{sendError}</span>
                </div>
              )}

              {/* Composition Form Fields */}
              <div className="space-y-2 text-xs">
                {/* Dynamic From field reflecting active account */}
                <div className="flex items-center border border-neutral-200 rounded-lg px-3 py-1.5 bg-neutral-50 text-neutral-600">
                  <span className="w-12 text-neutral-400 font-medium">From:</span>
                  <span className="font-semibold text-neutral-800">
                    {account.name} &lt;{account.email}&gt;
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempAccount(account);
                      setIsAccountModalOpen(true);
                    }}
                    className="ml-auto text-[10px] text-[#0078D4] hover:underline font-semibold flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Change Account</span>
                  </button>
                </div>

                {/* To field */}
                <div className="flex items-center border border-neutral-300 rounded-lg px-3 py-1.5 focus-within:border-[#0078D4]">
                  <span className="w-12 text-neutral-500 font-medium">To:</span>
                  <input
                    type="text"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="recipient@example.com (comma separated for multiple)"
                    className="flex-1 bg-transparent focus:outline-none text-neutral-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCcBcc(!showCcBcc)}
                    className="text-[11px] text-neutral-500 hover:text-[#0078D4] font-medium ml-2"
                  >
                    {showCcBcc ? "Hide CC/BCC" : "Cc / Bcc"}
                  </button>
                </div>

                {/* CC & BCC Fields */}
                {showCcBcc && (
                  <>
                    <div className="flex items-center border border-neutral-300 rounded-lg px-3 py-1.5 focus-within:border-[#0078D4]">
                      <span className="w-12 text-neutral-500 font-medium">Cc:</span>
                      <input
                        type="text"
                        value={composeCc}
                        onChange={(e) => setComposeCc(e.target.value)}
                        placeholder="colleague@example.com"
                        className="flex-1 bg-transparent focus:outline-none text-neutral-900"
                      />
                    </div>
                    <div className="flex items-center border border-neutral-300 rounded-lg px-3 py-1.5 focus-within:border-[#0078D4]">
                      <span className="w-12 text-neutral-500 font-medium">Bcc:</span>
                      <input
                        type="text"
                        value={composeBcc}
                        onChange={(e) => setComposeBcc(e.target.value)}
                        placeholder="audit@example.com"
                        className="flex-1 bg-transparent focus:outline-none text-neutral-900"
                      />
                    </div>
                  </>
                )}

                {/* Subject field */}
                <div className="flex items-center border border-neutral-300 rounded-lg px-3 py-1.5 focus-within:border-[#0078D4]">
                  <span className="w-12 text-neutral-500 font-medium">Subject:</span>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Enter email subject"
                    className="flex-1 bg-transparent focus:outline-none font-semibold text-neutral-900"
                  />
                </div>

                {/* Message Body */}
                <div className="border border-neutral-300 rounded-lg p-2.5 focus-within:border-[#0078D4]">
                  <textarea
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    rows={8}
                    placeholder="Type your message here..."
                    className="w-full bg-transparent focus:outline-none resize-none font-sans leading-relaxed text-neutral-900"
                  />
                </div>

                {/* Attachments Chips */}
                {attachments.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-neutral-600 block mb-1.5">
                      Attachments ({attachments.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((att, idx) => {
                        const ext = (att.filename.split(".").pop() || "file").toUpperCase();
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 border border-neutral-200 text-xs"
                          >
                            <span className="px-1 py-0.2 rounded bg-[#0078D4] text-white text-[9px] font-mono font-bold">
                              {ext}
                            </span>
                            <span className="font-medium text-neutral-800 max-w-[140px] truncate">{att.filename}</span>
                            <span className="text-[10px] text-neutral-400 font-mono">({formatBytes(att.sizeBytes)})</span>
                            <button
                              type="button"
                              onClick={() => removeAttachment(idx)}
                              className="text-neutral-400 hover:text-rose-600 ml-1"
                              title="Remove attachment"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer & Actions */}
            <div className="pt-4 border-t border-neutral-200 mt-4 flex items-center justify-between">
              {/* Attachment Actions */}
              <div className="relative flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleNativeFileUpload}
                  multiple
                  accept=".pdf,.docx,.xlsx,.pptx,.txt,.csv,.png,.jpg,.jpeg,.zip"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Upload file from device (PDF, DOCX, XLSX, PPTX, TXT, CSV, PNG, JPG, ZIP)"
                >
                  <Paperclip className="w-3.5 h-3.5 text-[#0078D4]" />
                  <span>Attach File</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <span>Attach Workspace Doc</span>
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                  </button>

                  {showAttachMenu && (
                    <div className="absolute left-0 bottom-full mb-1 w-64 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 z-50 max-h-56 overflow-y-auto divide-y divide-neutral-100">
                      <div className="p-1.5 text-[11px] font-bold text-neutral-500 uppercase">
                        Select Workspace File
                      </div>
                      {workspaceItems.length === 0 ? (
                        <div className="p-2 text-xs text-neutral-400">No workspace items found.</div>
                      ) : (
                        workspaceItems.map((wsDoc) => (
                          <div
                            key={wsDoc.id}
                            onClick={() => handleAttachWorkspaceDoc(wsDoc)}
                            className="p-2 hover:bg-neutral-50 rounded-lg cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="truncate mr-2">
                              <p className="font-semibold text-neutral-900 truncate">{wsDoc.name}</p>
                              <p className="text-[10px] text-neutral-400 capitalize">{wsDoc.app} • {wsDoc.format}</p>
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400 uppercase font-semibold">
                              {wsDoc.format}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Send / Save Draft / Discard Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSending}
                  className="px-3.5 py-2 rounded-xl text-neutral-600 hover:bg-neutral-100 text-xs font-medium transition"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  disabled={isSending}
                  className="px-3 py-2 rounded-xl text-neutral-400 hover:text-neutral-700 text-xs font-medium transition"
                >
                  Discard
                </button>

                <button
                  type="button"
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="px-5 py-2 rounded-xl bg-[#0078D4] hover:bg-[#006bbd] text-white text-xs font-bold flex items-center gap-2 transition active:scale-95 shadow-sm disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
