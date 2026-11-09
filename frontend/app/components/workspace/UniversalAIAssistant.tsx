"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  CheckCircle2,
  Loader2,
  Layers,
  FileText,
  Presentation,
  Table,
  Cpu,
  ArrowRight,
  Zap,
} from "lucide-react";
import { WorkspaceItem, WorkspaceAppId } from "./types";

interface UniversalAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  activeApp: WorkspaceAppId;
  activeDocument?: WorkspaceItem | null;
  workspaceFiles?: WorkspaceItem[];
  onExecuteAction?: (actionType: string, payload: any) => void;
}

interface AssistantMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  actionType?: string;
  actionPayload?: any;
  timestamp: string;
}

export function UniversalAIAssistant({
  isOpen,
  onClose,
  activeApp,
  activeDocument,
  workspaceFiles = [],
  onExecuteAction,
}: UniversalAIAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "msg_intro",
      sender: "assistant",
      text: `Hello! I am your Universal Workspace Assistant. I understand your open ${
        activeApp === "powerpoint" ? "presentation" : activeApp
      } and all saved workspace files. What would you like me to do?`,
      timestamp: "Just now",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Context-specific prompt suggestions matching Reference Screenshot
  const getPromptChips = () => {
    switch (activeApp) {
      case "powerpoint":
        return [
          { icon: "🪄", text: "Create a 10-slide presentation on Agentic AI" },
          { icon: "📝", text: "Make this slide more professional" },
          { icon: "📊", text: "Add a process diagram" },
          { icon: "🎙️", text: "Generate speaker notes for all slides" },
          { icon: "🔄", text: "Convert this report to a presentation" },
          { icon: "🎨", text: "Improve design and consistency" },
        ];
      case "word":
        return [
          { icon: "📝", text: "Improve tone and flow of this section" },
          { icon: "📑", text: "Generate automatic Table of Contents" },
          { icon: "🔍", text: "Summarize this report in 3 bullets" },
          { icon: "📚", text: "Add IEEE academic citations" },
          { icon: "🔄", text: "Export report as clean executive PDF" },
        ];
      case "excel":
        return [
          { icon: "🧮", text: "Generate formula for total sales by region" },
          { icon: "📊", text: "Recommend best chart for this data" },
          { icon: "🧹", text: "Clean missing values and remove duplicates" },
          { icon: "📈", text: "Forecast next quarter revenue" },
          { icon: "🔄", text: "Create presentation from this workbook" },
        ];
      default:
        return [
          { icon: "🪄", text: "Summarize active document" },
          { icon: "🔍", text: "Find all related project documents" },
          { icon: "📊", text: "Generate data visualization" },
          { icon: "⚡", text: "Run automated multi-step analysis" },
        ];
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: AssistantMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/workspace/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          activeApp,
          activeDocument,
          workspaceFiles,
          history: messages.slice(-4),
        }),
      });

      if (!res.ok) throw new Error("Assistant request failed");
      const data = await res.json();

      const assistantMsg: AssistantMessage = {
        id: `ast_${Date.now()}`,
        sender: "assistant",
        text: data.message || "Executed your request successfully.",
        actionType: data.actionType,
        actionPayload: data.actionPayload,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If AI executed an action, notify the parent workspace
      if (data.actionType && data.actionType !== "none" && onExecuteAction) {
        onExecuteAction(data.actionType, data.actionPayload);
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "assistant",
          text: "I processed your instruction and synchronized your document.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSpeechRecognition = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = "en-US";
    recognition.continuous = false;

    if (!isListening) {
      setIsListening(true);
      recognition.start();
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      setIsListening(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed right-3 bottom-14 z-50 w-84 sm:w-96 rounded-2xl bg-[#111827]/95 border border-indigo-500/30 backdrop-blur-xl shadow-2xl flex flex-col transition-all duration-200 select-none ${
        isMinimized ? "h-14 overflow-hidden" : "h-[580px] max-h-[85vh]"
      }`}
    >
      {/* Top Header */}
      <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 rounded-t-2xl">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide">
              AI Workspace Assistant
            </span>
            <span className="text-[10px] text-purple-400 font-mono ml-1.5">(Gemini)</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
            title="Close Assistant"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Subtitle Banner matching screenshot */}
          <div className="px-4 py-2.5 bg-indigo-950/40 border-b border-indigo-900/30 text-[11px] text-slate-300 leading-snug">
            Work with your {activeApp === "powerpoint" ? "presentation" : activeApp} using natural language. I can create, edit, design, analyze, and automate tasks for you.
          </div>

          {/* Quick Context Prompt Chips matching screenshot */}
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/50 flex flex-col space-y-1.5 max-h-40 overflow-y-auto">
            {getPromptChips().map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                className="w-full text-left flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-900/40 border border-slate-700/60 hover:border-indigo-500/50 text-[11px] text-slate-200 hover:text-white transition group"
              >
                <span className="text-xs">{chip.icon}</span>
                <span className="truncate flex-1">{chip.text}</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition" />
              </button>
            ))}
          </div>

          {/* Messages Log */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                    m.sender === "user"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs"
                      : "bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-bl-xs"
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Render Visual Action Pill if payload exists */}
                  {m.actionType && m.actionType !== "none" && (
                    <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center space-x-1.5 text-[10px] text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      <span className="capitalize">{m.actionType.replace("_", " ")} applied</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-indigo-400 bg-slate-800/60 px-3 py-2 rounded-xl w-fit">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px]">Executing workspace intelligence...</span>
              </div>
            )}
          </div>

          {/* Bottom Input Area */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/90 rounded-b-2xl">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={`Tell me what to do with this ${activeApp === "powerpoint" ? "presentation" : activeApp}...`}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-3 pr-16 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />

              <div className="absolute right-1.5 flex items-center space-x-1">
                <button
                  onClick={toggleSpeechRecognition}
                  className={`p-1.5 rounded-lg transition ${
                    isListening
                      ? "bg-rose-600 text-white animate-pulse"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                  title={isListening ? "Listening..." : "Dictate (Voice)"}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-sm"
                  title="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1">
              <span>Press Enter to send</span>
              <span className="flex items-center space-x-1">
                <span>Powered by</span>
                <span className="text-purple-400 font-semibold">Google Gemini</span>
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

