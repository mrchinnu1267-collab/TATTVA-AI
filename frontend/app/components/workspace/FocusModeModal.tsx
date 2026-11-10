"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Target,
} from "lucide-react";

interface FocusModeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FocusModeModal({ isOpen, onClose }: FocusModeModalProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60); // 25:00
  const [isActive, setIsActive] = useState<boolean>(false);
  const [deepWorkEnabled, setDeepWorkEnabled] = useState(true);
  const [noNotifications, setNoNotifications] = useState(true);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((s) => s - 1);
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  if (!isOpen) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-lg bg-white border border-[#E5E5E5] rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-center text-[#111111]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#111111]">
            <Target className="w-4 h-4 text-black" />
            <span>Distraction-Free Focus Mode</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-black hover:bg-neutral-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Timer Visual */}
        <div className="relative w-48 h-48 mx-auto rounded-full bg-neutral-50 border-4 border-[#E5E5E5] flex flex-col items-center justify-center shadow-xs">
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">
            Focus Session
          </span>
          <span className="text-4xl font-black text-[#111111] font-mono tracking-tight">
            {formattedTime}
          </span>

          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={() => setIsActive(!isActive)}
              className="p-2.5 rounded-full bg-black hover:bg-neutral-800 text-white shadow-xs transition"
              title={isActive ? "Pause" : "Start"}
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setIsActive(false);
                setSecondsLeft(25 * 60);
              }}
              className="p-2.5 rounded-full bg-white border border-[#E5E5E5] hover:bg-neutral-100 text-black transition shadow-xs"
              title="Reset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Environment Toggles */}
        <div className="grid grid-cols-2 gap-2.5 text-xs text-left">
          <div
            onClick={() => setDeepWorkEnabled(!deepWorkEnabled)}
            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition shadow-xs ${
              deepWorkEnabled ? "border-black bg-neutral-50 text-black font-semibold" : "border-[#E5E5E5] bg-white text-neutral-500"
            }`}
          >
            <span>Deep Work</span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${deepWorkEnabled ? "text-black" : "opacity-30"}`} />
          </div>

          <div
            onClick={() => setNoNotifications(!noNotifications)}
            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition shadow-xs ${
              noNotifications ? "border-black bg-neutral-50 text-black font-semibold" : "border-[#E5E5E5] bg-white text-neutral-500"
            }`}
          >
            <span>No Notifications</span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${noNotifications ? "text-black" : "opacity-30"}`} />
          </div>
        </div>

        {/* Today's Focus Stats */}
        <div className="p-4 rounded-2xl bg-neutral-50 border border-[#E5E5E5] flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] text-neutral-500 uppercase font-bold">Today&apos;s Focus</div>
            <div className="text-base font-bold text-[#111111] font-mono">2h 15m</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase font-bold">Sessions</div>
            <div className="text-base font-bold text-[#111111] font-mono">4 Completed</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase font-bold">Productivity</div>
            <div className="text-base font-bold text-emerald-700 font-mono">92%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FocusModeModal;
