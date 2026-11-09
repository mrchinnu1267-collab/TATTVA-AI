"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  Shield,
  Volume2,
  VolumeX,
  Sparkles,
  BarChart2,
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
  const [blockerEnabled, setBlockerEnabled] = useState(true);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-lg bg-[#0A0D18] border border-indigo-500/30 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-center text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Distraction-Free Focus Mode</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Circular Timer Visual matching Reference Screenshot */}
        <div className="relative w-48 h-48 mx-auto rounded-full bg-gradient-to-tr from-purple-950 via-slate-900 to-indigo-950 border-4 border-indigo-500/40 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.25)]">
          <span className="text-[10px] text-purple-300 font-semibold uppercase tracking-widest mb-1">
            Focus Session
          </span>
          <span className="text-4xl font-black text-white font-mono tracking-tight">
            {formattedTime}
          </span>

          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={() => setIsActive(!isActive)}
              className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition"
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                setIsActive(false);
                setSecondsLeft(25 * 60);
              }}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Environment Toggles matching screenshot */}
        <div className="grid grid-cols-2 gap-2 text-xs text-left">
          <div
            onClick={() => setDeepWorkEnabled(!deepWorkEnabled)}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
              deepWorkEnabled ? "border-indigo-500 bg-indigo-950/40 text-white" : "border-slate-800 bg-slate-900 text-slate-400"
            }`}
          >
            <span>Deep Work</span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${deepWorkEnabled ? "text-indigo-400" : "opacity-30"}`} />
          </div>

          <div
            onClick={() => setNoNotifications(!noNotifications)}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
              noNotifications ? "border-indigo-500 bg-indigo-950/40 text-white" : "border-slate-800 bg-slate-900 text-slate-400"
            }`}
          >
            <span>No Notifications</span>
            <CheckCircle2 className={`w-3.5 h-3.5 ${noNotifications ? "text-indigo-400" : "opacity-30"}`} />
          </div>
        </div>

        {/* Today's Focus Stats matching screenshot */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Today&apos;s Focus</div>
            <div className="text-base font-bold text-white font-mono">2h 15m</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Sessions</div>
            <div className="text-base font-bold text-indigo-400 font-mono">4 Completed</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase">Productivity</div>
            <div className="text-base font-bold text-emerald-400 font-mono">92%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

