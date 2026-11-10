"use client";

import React, { useState } from "react";
import {
  X,
  Users,
  MessageSquare,
  Send,
  Shield,
  Clock,
  CheckCircle2,
  Lock,
  Globe,
  Share2,
  Copy,
  Check,
} from "lucide-react";

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "viewer";
  avatar: string;
  status: "online" | "idle" | "offline";
  color: string;
}

interface CollaborationComment {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  resolved: boolean;
  replies?: Array<{ author: string; content: string; timestamp: string }>;
}

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle?: string;
}

export function CollaborationModal({
  isOpen,
  onClose,
  documentTitle = "Agentic AI - Project Review.pptx",
}: CollaborationModalProps) {
  const [activeTab, setActiveTab] = useState<"collaborators" | "comments" | "permissions">("collaborators");
  const [copiedLink, setCopiedLink] = useState(false);
  const [newComment, setNewComment] = useState("");

  const [collaborators, setCollaborators] = useState<Collaborator[]>([
    {
      id: "u1",
      name: "Kotapati Gowtham Chowdary",
      email: "gowtham@tattva.ai",
      role: "owner",
      avatar: "MK",
      status: "online",
      color: "#111111",
    },
    {
      id: "u2",
      name: "Sarah Chen",
      email: "sarah.chen@tattva.ai",
      role: "editor",
      avatar: "SC",
      status: "online",
      color: "#2563EB",
    },
    {
      id: "u3",
      name: "Alex Rivera",
      email: "alex.r@tattva.ai",
      role: "editor",
      avatar: "AR",
      status: "online",
      color: "#DB2777",
    },
    {
      id: "u4",
      name: "David Kim",
      email: "david.k@tattva.ai",
      role: "viewer",
      avatar: "DK",
      status: "idle",
      color: "#D97706",
    },
  ]);

  const [comments, setComments] = useState<CollaborationComment[]>([
    {
      id: "c1",
      author: "Sarah Chen",
      avatar: "SC",
      content: "Slide 3 system architecture diagram needs the offline-first sync container verified.",
      timestamp: "10 mins ago",
      resolved: false,
      replies: [
        {
          author: "Kotapati Gowtham Chowdary",
          content: "Updated in latest commit with verified OpenXML diagram element.",
          timestamp: "5 mins ago",
        },
      ],
    },
    {
      id: "c2",
      author: "Alex Rivera",
      avatar: "AR",
      content: "The quarterly metrics in Excel are aligned with the PowerPoint benchmark charts.",
      timestamp: "25 mins ago",
      resolved: true,
    },
  ]);

  const handleCopyShareLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const item: CollaborationComment = {
      id: `c_${Date.now()}`,
      author: "Kotapati Gowtham Chowdary",
      avatar: "MK",
      content: newComment.trim(),
      timestamp: "Just now",
      resolved: false,
    };
    setComments((prev) => [item, ...prev]);
    setNewComment("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-xl bg-white border border-[#E5E5E5] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#111111]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">
                Real-Time Collaboration
              </h2>
              <p className="text-xs text-neutral-500 truncate max-w-xs sm:max-w-md">
                {documentTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#E5E5E5] flex space-x-4 text-xs font-semibold bg-white">
          <button
            onClick={() => setActiveTab("collaborators")}
            className={`py-3 border-b-2 transition ${
              activeTab === "collaborators"
                ? "border-black text-black"
                : "border-transparent text-neutral-500 hover:text-black"
            }`}
          >
            Active Users ({collaborators.filter((c) => c.status === "online").length})
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`py-3 border-b-2 transition ${
              activeTab === "comments"
                ? "border-black text-black"
                : "border-transparent text-neutral-500 hover:text-black"
            }`}
          >
            Comments & Mentions ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`py-3 border-b-2 transition ${
              activeTab === "permissions"
                ? "border-black text-black"
                : "border-transparent text-neutral-500 hover:text-black"
            }`}
          >
            Sharing & Permissions
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-neutral-700">
          {activeTab === "collaborators" && (
            <div className="space-y-2.5">
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#E5E5E5] shadow-xs"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      style={{ backgroundColor: c.color }}
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-xs"
                    >
                      {c.avatar}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-[#111111]">{c.name}</div>
                      <div className="text-[11px] text-neutral-500">{c.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-[#E5E5E5] font-semibold">
                      {c.role}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        c.status === "online" ? "bg-emerald-500 animate-pulse" : "bg-neutral-300"
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  placeholder="Add a comment or @mention a team member..."
                  className="flex-1 bg-white border border-[#E5E5E5] rounded-xl px-3 py-2 text-xs text-[#111111] placeholder-neutral-400 focus:outline-none focus:border-black shadow-xs"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-3 py-2 rounded-xl bg-black hover:bg-neutral-800 disabled:opacity-40 text-white transition flex items-center space-x-1 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="font-semibold text-xs">Post</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {comments.map((cm) => (
                  <div
                    key={cm.id}
                    className="p-3 rounded-xl bg-white border border-[#E5E5E5] space-y-1.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-full bg-neutral-100 border border-[#E5E5E5] flex items-center justify-center font-bold text-[10px] text-black">
                          {cm.avatar}
                        </span>
                        <span className="font-bold text-xs text-[#111111]">{cm.author}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400">{cm.timestamp}</span>
                    </div>

                    <p className="text-neutral-700 text-xs pl-8">{cm.content}</p>

                    {cm.replies && cm.replies.length > 0 && (
                      <div className="ml-8 mt-2 pl-3 border-l-2 border-neutral-300 space-y-1.5">
                        {cm.replies.map((rp, i) => (
                          <div key={i} className="text-[11px]">
                            <span className="font-bold text-[#111111]">{rp.author}: </span>
                            <span className="text-neutral-600">{rp.content}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "permissions" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white border border-[#E5E5E5] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-xs text-[#111111]">General Access</div>
                      <div className="text-[11px] text-neutral-500">Anyone in this workspace with link can edit</div>
                    </div>
                  </div>
                  <span className="text-xs text-neutral-700 font-semibold bg-neutral-100 border border-[#E5E5E5] px-2 py-0.5 rounded">Workspace Only</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E5E5E5]">
                  <span className="text-[11px] text-neutral-500">Shareable collaboration link:</span>
                  <button
                    onClick={handleCopyShareLink}
                    className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-black hover:bg-neutral-800 text-white text-xs font-semibold transition shadow-xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E5E5E5] flex items-center justify-between bg-[#F9FAFB] text-[11px] text-neutral-500">
          <div className="flex items-center space-x-1.5 text-emerald-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Supabase Realtime Sync Connected</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-black hover:bg-neutral-800 text-white font-medium transition shadow-xs text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollaborationModal;
