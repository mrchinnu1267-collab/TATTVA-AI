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
      color: "#107C41",
    },
    {
      id: "u2",
      name: "Sarah Chen",
      email: "sarah.chen@engineering.tattva.ai",
      role: "editor",
      avatar: "SC",
      status: "online",
      color: "#6366F1",
    },
    {
      id: "u3",
      name: "Alex Rivera",
      email: "alex.rivera@product.tattva.ai",
      role: "editor",
      avatar: "AR",
      status: "online",
      color: "#EC4899",
    },
    {
      id: "u4",
      name: "David Kim",
      email: "david.kim@analytics.tattva.ai",
      role: "viewer",
      avatar: "DK",
      status: "idle",
      color: "#EAB308",
    },
  ]);

  const [comments, setComments] = useState<CollaborationComment[]>([
    {
      id: "c1",
      author: "Sarah Chen",
      avatar: "SC",
      content: "Slide 3 system architecture diagram needs the offline-first sync badge verified.",
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
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-xl bg-[#0F172A] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Real-Time Collaboration
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
                {documentTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 flex space-x-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("collaborators")}
            className={`py-3 border-b-2 transition ${
              activeTab === "collaborators"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Active Users ({collaborators.filter((c) => c.status === "online").length})
          </button>
          <button
            onClick={() => setActiveTab("comments")}
            className={`py-3 border-b-2 transition ${
              activeTab === "comments"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Comments & Mentions ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab("permissions")}
            className={`py-3 border-b-2 transition ${
              activeTab === "permissions"
                ? "border-indigo-500 text-indigo-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            Sharing & Permissions
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-slate-300 space-y-4">
          {activeTab === "collaborators" && (
            <div className="space-y-3">
              <div className="text-slate-400 text-[11px]">
                Currently viewing and editing this document in real time:
              </div>
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.avatar}
                        </div>
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0F172A] ${
                            c.status === "online"
                              ? "bg-emerald-500"
                              : c.status === "idle"
                              ? "bg-amber-500"
                              : "bg-slate-500"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-[11px] text-slate-400">{c.email}</div>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {c.role}
                    </span>
                  </div>
                ))}
              </div>
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
                  placeholder="Add a comment or mention @colleague..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddComment}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition"
                >
                  Comment
                </button>
              </div>

              <div className="space-y-3">
                {comments.map((cm) => (
                  <div
                    key={cm.id}
                    className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px]">
                          {cm.avatar}
                        </div>
                        <span className="font-semibold text-white">{cm.author}</span>
                      </div>
                      <span className="text-[10px] text-slate-500">{cm.timestamp}</span>
                    </div>

                    <p className="text-slate-300 text-xs pl-8">{cm.content}</p>

                    {cm.replies && cm.replies.length > 0 && (
                      <div className="ml-8 mt-2 pl-3 border-l-2 border-indigo-500/40 space-y-1.5">
                        {cm.replies.map((rp, i) => (
                          <div key={i} className="text-[11px]">
                            <span className="font-semibold text-indigo-300">{rp.author}: </span>
                            <span className="text-slate-300">{rp.content}</span>
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
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-white">General Access</div>
                      <div className="text-[11px] text-slate-400">Anyone in this workspace with link can edit</div>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-400 font-semibold">Workspace Only</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-[11px] text-slate-400">Shareable collaboration link:</span>
                  <button
                    onClick={handleCopyShareLink}
                    className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-semibold transition"
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
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-between bg-slate-900/80 text-[11px] text-slate-400">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Supabase Realtime Sync Connected</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
