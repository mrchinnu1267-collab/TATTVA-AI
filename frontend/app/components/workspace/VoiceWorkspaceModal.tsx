"use client";

import React, { useState } from "react";
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface VoiceWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteVoiceCommand?: (command: string) => void;
}

export function VoiceWorkspaceModal({
  isOpen,
  onClose,
  onExecuteVoiceCommand,
}: VoiceWorkspaceModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("Listening for voice instruction...");
  const [recognizedCommand, setRecognizedCommand] = useState<string | null>(null);

  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Web Speech API is not supported in this browser. Please use Google Chrome or Edge.");
      return;
    }
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = "en-US";
    recognition.continuous = false;

    setIsListening(true);
    setTranscript("Listening... Speak now.");
    recognition.start();

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setRecognizedCommand(text);
      setIsListening(false);

      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(`Understood. Executing: ${text}`);
        window.speechSynthesis.speak(utterance);
      }

      if (onExecuteVoiceCommand) {
        onExecuteVoiceCommand(text);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      setTranscript("Voice recognition paused. Tap microphone to speak again.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md bg-[#0A0D18] border border-indigo-500/30 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-center text-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <Mic className="w-4 h-4 text-purple-400" />
            <span>Voice Workspace Assistant</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pulsing Microphone Button */}
        <div className="relative py-4">
          <button
            onClick={startVoiceInput}
            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-xl ${
              isListening
                ? "bg-rose-600 ring-8 ring-rose-500/30 scale-110 animate-pulse"
                : "bg-gradient-to-tr from-purple-600 to-indigo-600 hover:scale-105"
            }`}
          >
            {isListening ? <Mic className="w-10 h-10" /> : <MicOff className="w-10 h-10 opacity-70" />}
          </button>

          {/* Animated Wave Bars */}
          {isListening && (
            <div className="flex items-center justify-center space-x-1.5 mt-4">
              <span className="w-1 h-6 bg-indigo-400 rounded-full animate-bounce" />
              <span className="w-1 h-10 bg-purple-400 rounded-full animate-bounce [animation-delay:0.1s]" />
              <span className="w-1 h-8 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1 h-12 bg-pink-400 rounded-full animate-bounce [animation-delay:0.3s]" />
              <span className="w-1 h-6 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          )}
        </div>

        {/* Live Transcript Box */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 min-h-16 flex items-center justify-center">
          <p className="italic">{transcript}</p>
        </div>

        <div className="text-[11px] text-slate-500 space-y-1">
          <p>Try saying:</p>
          <p className="text-slate-400">&quot;Create a presentation on Agentic AI&quot;</p>
          <p className="text-slate-400">&quot;Summarize active project report&quot;</p>
        </div>
      </div>
    </div>
  );
}

