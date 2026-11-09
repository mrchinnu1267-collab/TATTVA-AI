"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Square,
  RotateCcw,
  RotateCw,
  CheckCircle2,
  Clock,
  Layers,
  Palette,
  FileText,
  Table as TableIcon,
  ChevronRight,
  Zap,
  Mic,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { PresentationState } from "./types";
import { executeToolOnPresentation } from "./ai-tools";

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  presentation: PresentationState;
  onUpdatePresentation: (next: PresentationState) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  steps?: Array<{ tool: string; message: string }>;
  timestamp: string;
}

export function AIAssistantPanel({
  isOpen,
  onClose,
  presentation,
  onUpdatePresentation,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: AIAssistantPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg_init",
      sender: "assistant",
      text: "Hello! I am your TATTVA AI Presentation Assistant. I can generate complete slide decks, insert process diagrams, format text, and apply themes directly in this editor. What would you like to create or edit?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentStep]);

  const quickPrompts = [
    "Create an 8-slide presentation about Agentic AI",
    "Add a 4-step process diagram to this slide",
    "Switch to Professional White theme",
    "Insert a comparison table on this slide",
    "Generate speaker notes for every slide",
    "Add Fade transitions to all slides",
  ];

  const handleSendPrompt = async (textToSend?: string) => {
    const commandText = (textToSend || prompt).trim();
    if (!commandText || isLoading) return;

    setPrompt("");
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      text: commandText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setCurrentStep("Understanding instruction...");

    abortControllerRef.current = new AbortController();

    try {
      setCurrentStep("AI is thinking & planning changes...");

      const res = await fetch("/api/presentation/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: commandText,
          presentation,
          currentSlideNumber: presentation.currentSlideIndex + 1,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "AI service temporarily unavailable.");
      }

      const data = await res.json();
      const steps = data.steps || [];

      let workingState = presentation;
      const executedSteps: Array<{ tool: string; message: string }> = [];

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        setCurrentStep(`Executing: ${step.tool.replace(/_/g, " ")} (${i + 1}/${steps.length})...`);
        
        // Short visible execution delay so user sees actions happening visibly in real-time
        await new Promise((r) => setTimeout(r, 400));

        const result = executeToolOnPresentation(step.tool, step.args, workingState);
        workingState = result.nextState;
        onUpdatePresentation(workingState);
        executedSteps.push({ tool: step.tool, message: result.message });
      }

      setCurrentStep("Completed!");
      await new Promise((r) => setTimeout(r, 200));

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        sender: "assistant",
        text: data.reply || `Completed ${steps.length} operation(s) on your presentation.`,
        steps: executedSteps,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "assistant",
            text: "Operation cancelled by user.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "assistant",
            text: `Error: ${err.message || "Failed to process instruction."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setCurrentStep(null);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  if (!isOpen) return null;

  return (
    <aside className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shrink-0 select-none shadow-2xl z-20">
      {/* 1. Header Bar */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold tracking-tight text-white flex items-center space-x-1.5">
              <span>PowerPoint AI Agent</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-orange-500/20 text-orange-400 rounded">
                Gemini
              </span>
            </h2>
            <p className="text-[10px] text-slate-400">Controls this presentation in real time</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            title="Undo AI edit"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition"
            title="Redo AI edit"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Messages List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[90%] p-3 rounded-xl leading-relaxed ${
                msg.sender === "user"
                  ? "bg-orange-600 text-white rounded-br-none"
                  : "bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none shadow-sm"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>

              {msg.steps && msg.steps.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-700/60 space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                    Visible Actions Executed:
                  </div>
                  {msg.steps.map((st, i) => (
                    <div key={i} className="flex items-center space-x-1.5 text-[11px] text-slate-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{st.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {/* Live Execution Stepper */}
        {isLoading && currentStep && (
          <div className="p-3 rounded-xl bg-slate-800/80 border border-orange-500/30 text-xs text-orange-300 flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-2">
              <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-medium">{currentStep}</span>
            </div>
            <button
              onClick={handleStop}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 text-[10px] font-semibold border border-rose-500/40 transition"
              title="Stop ongoing operation"
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 3. Quick Suggestions Chips */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/40">
        <div className="text-[10px] font-semibold uppercase text-slate-400 px-1 mb-1.5">
          Quick Prompts
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPrompt(qp)}
              disabled={isLoading}
              className="text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-md border border-slate-700/60 transition truncate max-w-full text-left disabled:opacity-40"
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Input Area */}
      <div className="p-3 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex items-center space-x-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Ask AI to edit, create or format slides..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isLoading}
              className="w-full pl-3 pr-8 py-2 text-xs bg-slate-800 border border-slate-700 focus:border-orange-500 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none transition disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className="p-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-semibold shadow transition shrink-0"
            title="Execute instruction"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
}

