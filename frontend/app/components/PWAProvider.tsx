"use client";

import React, { useEffect, useState } from "react";
import { WifiOff, Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker for PWA
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[TATTVA PWA] Service Worker registered with scope:", reg.scope);
        })
        .catch((err) => {
          console.warn("[TATTVA PWA] Service Worker registration failed:", err);
        });
    }

    // 2. Online / Offline status monitoring
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // 3. Capture PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show install toast if user hasn't dismissed it
      const dismissed = localStorage.getItem("tattva_pwa_dismissed");
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismissInstall = () => {
    setShowInstallBanner(false);
    localStorage.setItem("tattva_pwa_dismissed", "true");
  };

  return (
    <>
      {/* Offline Status Notification */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-lg animate-in slide-in-from-top">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>
            You are offline. Cached pages are available. Real-time AI will resume when connection restores.
          </span>
        </div>
      )}

      {/* PWA Install Banner */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 flex items-center justify-between gap-3 rounded-2xl border border-black/10 dark:border-neutral-700 bg-white/95 dark:bg-[#18181b]/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white shadow-xs p-0.5">
              <img
                src="/logo.png"
                alt="TATTVA AI"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate text-neutral-900 dark:text-neutral-100">
                Install TATTVA AI
              </div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                Install as standalone app on your device
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl bg-black dark:bg-white text-white dark:text-black px-3 py-1.5 text-xs font-semibold hover:opacity-90 transition shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={dismissInstall}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
