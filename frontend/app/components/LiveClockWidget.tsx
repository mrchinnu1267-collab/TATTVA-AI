"use client";

import React, { useState, useEffect } from "react";
import { Clock, Globe, Sparkles } from "lucide-react";

export interface ClockData {
  currentTime: string;
  currentSeconds?: string;
  currentDate: string;
  dayOfWeek?: string;
  timeZone: string;
  rawTimeZone?: string;
  utcOffset?: string;
  timestamp?: number;
  targetCity?: string;
  summaryText?: string;
}

interface LiveClockWidgetProps {
  clockData?: ClockData;
  isDark?: boolean;
}

const WORLD_CITIES = [
  { label: "Local", tz: undefined },
  { label: "London", tz: "Europe/London" },
  { label: "New York", tz: "America/New_York" },
  { label: "Tokyo", tz: "Asia/Tokyo" },
  { label: "Dubai", tz: "Asia/Dubai" },
];

export default function LiveClockWidget({ clockData, isDark = true }: LiveClockWidgetProps) {
  const [activeTz, setActiveTz] = useState<string | undefined>(
    clockData?.rawTimeZone || undefined
  );
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time with active timezone
  const tz = activeTz || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  const timeString = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(time);

  const dateString = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(time);

  // Timezone string
  let offsetString = "";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(time);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart) offsetString = tzPart.value;
  } catch {}

  // Analog hands angles
  const tzDate = new Date(time.toLocaleString("en-US", { timeZone: tz }));
  const seconds = tzDate.getSeconds();
  const minutes = tzDate.getMinutes();
  const hours = tzDate.getHours() % 12;

  const secondDeg = seconds * 6;
  const minuteDeg = minutes * 6 + seconds * 0.1;
  const hourDeg = hours * 30 + minutes * 0.5;

  return (
    <div
      className={`my-3 overflow-hidden rounded-2xl border transition-all ${
        isDark
          ? "border-sky-500/30 bg-neutral-900/90 text-white shadow-xl shadow-sky-950/20"
          : "border-sky-300 bg-white/90 text-neutral-900 shadow-lg shadow-sky-100"
      } backdrop-blur-md`}
    >
      {/* Top Header Pill */}
      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-bold tracking-wide flex items-center gap-1.5 text-sky-500 dark:text-sky-400">
            <Clock className="w-3.5 h-3.5" /> In-built Live Clock
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
          <Globe className="w-3 h-3 text-emerald-500" />
          <span>{tz.replace(/_/g, " ")}</span>
          {offsetString && (
            <span className="rounded-full bg-emerald-500/10 text-emerald-500 font-semibold px-1.5 py-0.2">
              {offsetString}
            </span>
          )}
        </div>
      </div>

      {/* Main Clock Face & Display */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
        {/* Digital Readout */}
        <div className="text-center sm:text-left space-y-1">
          <div className="flex items-baseline justify-center sm:justify-start gap-1 font-mono tracking-tight">
            <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white drop-shadow-xs">
              {timeString.replace(/:[0-9]{2}\s/, " ")}
            </span>
            <span className="text-lg sm:text-xl font-bold text-sky-500 animate-pulse">
              :{seconds < 10 ? `0${seconds}` : seconds}
            </span>
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-neutral-400 ml-1">
              {timeString.slice(-2)}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300">
            {dateString}
          </p>
        </div>

        {/* Analog Clock Dial */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-sky-500/40 dark:border-sky-400/30 flex items-center justify-center bg-black/5 dark:bg-black/40 shadow-inner shrink-0">
          {/* Dial Center Pin */}
          <div className="absolute w-2 h-2 rounded-full bg-sky-500 z-10 shadow-xs"></div>

          {/* Hour Marks */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <div
              key={deg}
              className="absolute w-0.5 h-1.5 bg-neutral-400/60 rounded-full"
              style={{
                transform: `rotate(${deg}deg) translateY(-38px)`,
                transformOrigin: "center center",
              }}
            />
          ))}

          {/* Hour Hand */}
          <div
            className="absolute w-1 bg-neutral-800 dark:bg-white rounded-full transition-transform duration-300"
            style={{
              height: "26%",
              transform: `rotate(${hourDeg}deg) translateY(-50%)`,
              transformOrigin: "bottom center",
              bottom: "50%",
            }}
          />

          {/* Minute Hand */}
          <div
            className="absolute w-0.5 bg-sky-500 dark:bg-sky-400 rounded-full transition-transform duration-300"
            style={{
              height: "36%",
              transform: `rotate(${minuteDeg}deg) translateY(-50%)`,
              transformOrigin: "bottom center",
              bottom: "50%",
            }}
          />

          {/* Second Hand */}
          <div
            className="absolute w-0.5 bg-emerald-500 rounded-full"
            style={{
              height: "40%",
              transform: `rotate(${secondDeg}deg) translateY(-50%)`,
              transformOrigin: "bottom center",
              bottom: "50%",
            }}
          />
        </div>
      </div>

      {/* World Time Quick City Switcher */}
      <div className="border-t border-black/5 dark:border-white/10 px-3 py-2 flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-medium bg-black/[0.02] dark:bg-white/[0.02]">
        <span className="text-neutral-400 flex items-center gap-1 shrink-0 px-1">
          <Sparkles className="w-3 h-3 text-sky-400" /> World:
        </span>
        <div className="flex items-center gap-1 overflow-x-auto">
          {WORLD_CITIES.map((c) => {
            const isSelected = activeTz === c.tz || (!activeTz && c.tz === undefined);
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => setActiveTz(c.tz)}
                className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-sky-500 text-white font-bold shadow-xs"
                    : "text-neutral-500 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

