"use client";

import React, { useState } from "react";
import {
  X,
  Mic,
  MicOff,
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
  const [transcript, setTranscript] = useState("Tap microphone to dictate or speak a command...");

  const startVoiceInput = () => {
    if (typeof window === "undefined") return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-white border border-[#E5E5E5] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-center text-[#111111]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#111111]">
            <Mic className="w-4 h-4 text-black" />
            <span>Voice Workspace Assistant</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Microphone Button */}
        <div className="relative py-4">
          <button
            onClick={startVoiceInput}
            className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-md ${
              isListening
                ? "bg-rose-600 ring-8 ring-rose-200 scale-110 animate-pulse"
                : "bg-black hover:bg-neutral-800 hover:scale-105"
            }`}
          >
            {isListening ? <Mic className="w-10 h-10 text-white" /> : <MicOff className="w-10 h-10 text-neutral-400" />}
          </button>
        </div>

        {/* Live Transcript Box */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-[#E5E5E5] text-xs text-neutral-700 min-h-16 flex items-center justify-center shadow-xs">
          <p className="italic font-medium">{transcript}</p>
        </div>

        <div className="text-[11px] text-neutral-500 space-y-1">
          <p className="font-semibold text-neutral-700">Try saying:</p>
          <p className="text-neutral-600">&quot;Create a presentation on Agentic AI&quot;</p>
          <p className="text-neutral-600">&quot;Open financial model spreadsheet&quot;</p>
        </div>
      </div>
    </div>
  );
}

export default VoiceWorkspaceModal;
