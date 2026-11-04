"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  Moon,
  Sun,
  Radio,
  Zap,
  ArrowLeft,
  X,
  RefreshCw,
  AlertCircle,
  FolderArchive,
  MapPin,
  Globe,
} from "lucide-react";

type VoiceState = "idle" | "listening" | "thinking" | "speaking" | "error";

type TranscriptTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
};

// Language detection for high fluency in Telugu, Southern languages, Hindi, and English
function detectLanguage(text: string): { lang: string; name: string } {
  if (/[\u0C00-\u0C7F]/.test(text)) return { lang: "te-IN", name: "Telugu" };
  if (/[\u0B80-\u0BFF]/.test(text)) return { lang: "ta-IN", name: "Tamil" };
  if (/[\u0C80-\u0CFF]/.test(text)) return { lang: "kn-IN", name: "Kannada" };
  if (/[\u0D00-\u0D7F]/.test(text)) return { lang: "ml-IN", name: "Malayalam" };
  if (/[\u0900-\u097F]/.test(text)) return { lang: "hi-IN", name: "Hindi" };
  return { lang: "en-IN", name: "English" };
}

// Select a natural, fluent female voice strictly excluding male voices across all OS and browsers
function selectFemaleVoice(langCode: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Names and tokens to strictly reject to prevent any robotic male voice
  const maleKeywords = [
    "david", "george", "mark", "richard", "james", "john", "ravi", "madhav",
    "male", "guy", "man", "sean", "stefan", "paul", "microsoft david", "microsoft mark",
    "microsoft george", "microsoft ravi", "microsoft stefan", "microsoft james",
    "microsoft richard", "heera - male"
  ];

  // Priority fluent female voice models (Edge Natural, Chrome, Siri, WebSpeech)
  const femaleKeywords = [
    "jenny", "aria", "zira", "neerja", "swara", "heera", "chitra", "shruti",
    "priya", "samantha", "victoria", "karen", "eva", "moira", "fiona", "tessa",
    "veena", "pallavi", "geeta", "vani", "ananya", "female", "woman",
    "google uk english female", "google us english", "natural"
  ];

  const isMale = (name: string) => {
    const lower = name.toLowerCase();
    return maleKeywords.some((kw) => lower.includes(kw));
  };

  const isFemale = (name: string) => {
    const lower = name.toLowerCase();
    return femaleKeywords.some((kw) => lower.includes(kw));
  };

  // Filter out male voices completely
  const nonMaleVoices = voices.filter((v) => !isMale(v.name));

  const prefix = langCode.slice(0, 2).toLowerCase();
  const langNonMale = nonMaleVoices.filter((v) => v.lang.toLowerCase().startsWith(prefix));

  // 1. Language-matching verified female voice
  const exactFemale = langNonMale.find((v) => isFemale(v.name));
  if (exactFemale) return exactFemale;

  // 2. Any language-matching non-male voice
  if (langNonMale.length > 0) return langNonMale[0];

  // 3. Indian / English verified female voice
  const verifiedFemale = nonMaleVoices.find((v) => isFemale(v.name));
  if (verifiedFemale) return verifiedFemale;

  // 4. Any remaining non-male voice
  if (nonMaleVoices.length > 0) return nonMaleVoices[0];

  // 5. Ultimate fallback if system only has 1 voice
  return voices[0] || null;
}

export default function LiveVoiceAssistantPage() {
  const router = useRouter();

  // State Management
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real-time audio energy (0.0 to 1.0)
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [liveUserSpeech, setLiveUserSpeech] = useState<string>("");
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");

  // Audio & Web Audio API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Speech Recognition & State Guards (Echo prevention & deduplication)
  const recognitionRef = useRef<unknown>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceBufferRef = useRef<string>("");
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const isAssistantSpeakingRef = useRef<boolean>(false);
  const isProcessingTurnRef = useRef<boolean>(false);
  const lastSubmittedPromptRef = useRef<string>("");
  const lastSubmittedTimeRef = useRef<number>(0);
  const userLocationRef = useRef<{ latitude?: number; longitude?: number; city?: string } | null>(null);
  const [userLocationName, setUserLocationName] = useState<string | null>(null);

  // Geolocation request for real-time weather & location-based reports
  const requestLocation = useCallback(() => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          userLocationRef.current = loc;
          try {
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${loc.latitude}&longitude=${loc.longitude}&localityLanguage=en`
            );
            if (res.ok) {
              const data = await res.json();
              const name = data.city || data.locality || data.principalSubdivision;
              if (name) setUserLocationName(name);
            }
          } catch {
            // ignore
          }
        },
        (err) => {
          console.warn("[Voice Assistant] Geolocation not granted:", err.message);
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
      );
    }
  }, []);

  // Mount setup, location acquisition & voice warming for Android WebView
  useEffect(() => {
    const savedTheme = localStorage.getItem("tattva_theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    // Warm voices for Android Chrome & WebView
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Pre-fetch location for real-time weather reports
    requestLocation();
  }, [requestLocation]);

  function toggleTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("tattva_theme", nextTheme);
  }

  // Barge-in: Interrupt assistant safely when user starts talking or clicks interrupt
  const interruptAssistant = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    isAssistantSpeakingRef.current = false;
    isProcessingTurnRef.current = false;
    voiceBufferRef.current = "";
    setLiveUserSpeech("");
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Web Audio API: Setup audio analyzer on microphone stream
  const setupAudioCapture = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Microphone access is not supported on this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      source.connect(analyser);

      // Animation loop for audio visualizer
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const renderAudioVisualizer = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume energy
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, Math.max(0, avg / 128));
        setAudioLevel(normalized);

        // Draw real-time waveform on Canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);

            ctx.lineWidth = 2.5;
            ctx.strokeStyle = isDark
              ? `rgba(255, 255, 255, ${0.4 + normalized * 0.6})`
              : `rgba(0, 0, 0, ${0.35 + normalized * 0.65})`;
            ctx.beginPath();

            const sliceWidth = width / dataArray.length;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
              const v = dataArray[i] / 128.0;
              const y = (v * height) / 2;

              if (i === 0) {
                ctx.moveTo(x, y);
              } else {
                ctx.lineTo(x, y);
              }
              x += sliceWidth;
            }

            ctx.lineTo(width, height / 2);
            ctx.stroke();
          }
        }

        animationFrameRef.current = requestAnimationFrame(renderAudioVisualizer);
      };

      renderAudioVisualizer();
      return true;
    } catch (err: unknown) {
      console.error("Audio capture failed:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to access microphone. Please grant permission."
      );
      setVoiceState("error");
      return false;
    }
  }, [isDark]);

  // Clean narration to speech synthesis with universal audio streaming fallback
  const speakSpokenResponse = useCallback(
    (text: string, onDone?: () => void) => {
      // Stop any prior speech or audio playback
      if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current = null;
      }

      // Clean narration: strip code fences, markdown links, asterisks
      const cleanSpoken = text
        .replace(/```[\s\S]*?```/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/#{1,6}\s+/g, "")
        .replace(/[-*]\s+/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();

      if (!cleanSpoken) {
        isAssistantSpeakingRef.current = false;
        isProcessingTurnRef.current = false;
        if (onDone) onDone();
        return;
      }

      const { lang: detectedLang } = detectLanguage(cleanSpoken);
      const targetLang = selectedLanguage !== "auto" ? selectedLanguage : detectedLang;

      // Universal audio streaming fallback for Android WebView or mobile browsers
      const playAudioFallback = () => {
        try {
          const ttsLang = targetLang === "te" ? "te" : targetLang === "hi" ? "hi" : "en";
          const audioUrl = `/api/tts?text=${encodeURIComponent(cleanSpoken)}&lang=${ttsLang}`;
          const audio = new Audio(audioUrl);
          audioPlayerRef.current = audio;

          isAssistantSpeakingRef.current = true;
          setVoiceState("speaking");
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          voiceBufferRef.current = "";
          setLiveUserSpeech("");

          audio.onended = () => {
            audioPlayerRef.current = null;
            setTimeout(() => {
              isAssistantSpeakingRef.current = false;
              isProcessingTurnRef.current = false;
              voiceBufferRef.current = "";
              setLiveUserSpeech("");
              if (isSessionActive && !isMuted) {
                setVoiceState("listening");
              }
              if (onDone) onDone();
            }, 450);
          };

          audio.onerror = () => {
            audioPlayerRef.current = null;
            isAssistantSpeakingRef.current = false;
            isProcessingTurnRef.current = false;
            if (isSessionActive && !isMuted) {
              setVoiceState("listening");
            }
            if (onDone) onDone();
          };

          audio.play().catch(() => {
            isAssistantSpeakingRef.current = false;
            isProcessingTurnRef.current = false;
            if (onDone) onDone();
          });
        } catch {
          isAssistantSpeakingRef.current = false;
          isProcessingTurnRef.current = false;
          if (onDone) onDone();
        }
      };

      const hasSpeechSynth =
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        Boolean(window.speechSynthesis);

      if (!hasSpeechSynth) {
        playAudioFallback();
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(cleanSpoken);
        currentUtteranceRef.current = utterance;
        utterance.lang = targetLang;

        const femaleVoice = selectFemaleVoice(utterance.lang);
        if (femaleVoice) {
          utterance.voice = femaleVoice;
        }

        utterance.pitch = 1.15;
        utterance.rate = 1.0;

        utterance.onstart = () => {
          isAssistantSpeakingRef.current = true;
          setVoiceState("speaking");
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          voiceBufferRef.current = "";
          setLiveUserSpeech("");
        };

        utterance.onend = () => {
          currentUtteranceRef.current = null;
          setTimeout(() => {
            isAssistantSpeakingRef.current = false;
            isProcessingTurnRef.current = false;
            voiceBufferRef.current = "";
            setLiveUserSpeech("");
            if (isSessionActive && !isMuted) {
              setVoiceState("listening");
            }
            if (onDone) onDone();
          }, 450);
        };

        utterance.onerror = () => {
          currentUtteranceRef.current = null;
          playAudioFallback();
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        playAudioFallback();
      }
    },
    [selectedLanguage, isSessionActive, isMuted]
  );

  // Send turn to backend voice-chat endpoint with deduplication and location
  const sendVoiceTurn = useCallback(
    async (spokenPrompt: string) => {
      const cleanPrompt = spokenPrompt.trim();
      if (!cleanPrompt) {
        isProcessingTurnRef.current = false;
        return;
      }

      setVoiceState("thinking");

      // Add user turn to transcript
      const userTurn: TranscriptTurn = {
        id: crypto.randomUUID(),
        role: "user",
        text: cleanPrompt,
        timestamp: Date.now(),
      };

      const updatedHistory = [...transcript, userTurn];
      setTranscript(updatedHistory);
      setLiveUserSpeech("");

      try {
        const payload = {
          prompt: cleanPrompt,
          history: updatedHistory.slice(-8).map((t) => ({ role: t.role, content: t.text })),
          language: selectedLanguage,
          location: userLocationRef.current,
        };

        const res = await fetch("/api/voice-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Voice request failed with HTTP ${res.status}`);
        }

        const data = await res.json();
        const aiReply = data.reply || "I am listening. How can I help you?";

        try {
          if (typeof window !== "undefined" && (window as any).AndroidBridge?.postResponseNotification) {
            (window as any).AndroidBridge.postResponseNotification("TATTVA AI", aiReply);
          } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification("TATTVA AI", { body: aiReply });
          }
        } catch {}

        const assistantTurn: TranscriptTurn = {
          id: crypto.randomUUID(),
          role: "assistant",
          text: aiReply,
          timestamp: Date.now(),
        };

        setTranscript((prev) => [...prev, assistantTurn]);

        // Speak response aloud via female voice
        speakSpokenResponse(aiReply, () => {
          isProcessingTurnRef.current = false;
          if (isSessionActive && !isMuted) {
            setVoiceState("listening");
          }
        });
      } catch (err: unknown) {
        console.error("Voice turn error:", err);
        setErrorMessage(err instanceof Error ? err.message : "Failed to generate speech response.");
        isProcessingTurnRef.current = false;
        setVoiceState("listening");
      }
    },
    [transcript, selectedLanguage, speakSpokenResponse, isSessionActive, isMuted]
  );

  // Speech Recognition with Continuous Listening, Echo Immunity, and Deduplication
  const startContinuousSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      setVoiceState("error");
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognition as any)();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage !== "auto" ? selectedLanguage : navigator.language || "en-US";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        // ECHO IMMUNITY: When Sare is speaking, discard microphone input so assistant never hears itself
        if (isAssistantSpeakingRef.current) {
          return;
        }

        // TURN LOCK: If an ongoing turn is thinking/processing, do not accept concurrent input
        if (isProcessingTurnRef.current) {
          return;
        }

        let interimText = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalChunk += event.results[i][0].transcript;
          } else {
            interimText += event.results[i][0].transcript;
          }
        }

        if (finalChunk.trim()) {
          voiceBufferRef.current = (voiceBufferRef.current ? `${voiceBufferRef.current} ${finalChunk.trim()}` : finalChunk.trim()).trim();
        }

        const currentSpoken = (voiceBufferRef.current + " " + interimText).trim();
        if (!currentSpoken) return;

        setLiveUserSpeech(currentSpoken);
        setVoiceState("listening");

        // Turn-taking VAD: Reset silence detector on speech
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }

        silenceTimerRef.current = setTimeout(() => {
          const promptToSubmit = (voiceBufferRef.current || currentSpoken).trim();
          if (!promptToSubmit) return;

          // Prevent duplicate / identical inputs within 4 seconds
          const now = Date.now();
          const isDuplicate =
            promptToSubmit.toLowerCase() === lastSubmittedPromptRef.current.toLowerCase() &&
            now - lastSubmittedTimeRef.current < 4000;

          if (isDuplicate || isProcessingTurnRef.current || isAssistantSpeakingRef.current) {
            return;
          }

          lastSubmittedPromptRef.current = promptToSubmit;
          lastSubmittedTimeRef.current = now;
          isProcessingTurnRef.current = true;
          voiceBufferRef.current = "";
          setLiveUserSpeech("");

          sendVoiceTurn(promptToSubmit);
        }, 1600); // 1.6 seconds of natural silence before submitting
      };

      recognition.onerror = (e: { error?: string }) => {
        if (e?.error === "no-speech") return;
        console.warn("Recognition error:", e);
      };

      recognition.onend = () => {
        // Automatically restart to keep voice session active if not explicitly ended or muted
        // 300ms backoff avoids Android InvalidStateError when audio hardware is transitioning
        if (isSessionActive && !isMuted) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch {
              // ignore
            }
          }, 300);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setVoiceState("listening");
    } catch (err) {
      console.error("Speech recognition startup error:", err);
    }
  }, [selectedLanguage, sendVoiceTurn, isSessionActive, isMuted]);

  // Start Live Voice Session
  const startSession = async () => {
    setErrorMessage(null);
    setVoiceState("listening");

    // Acquire location for accurate weather & local inquiries
    requestLocation();

    const audioReady = await setupAudioCapture();
    if (!audioReady) return;

    setIsSessionActive(true);
    setIsMuted(false);
    startContinuousSpeechRecognition();

    // Initial greeting if session is fresh
    if (transcript.length === 0) {
      const initialGreeting = "Hello! I am Sare, your live voice assistant. I am listening—what would you like to talk about?";
      speakSpokenResponse(initialGreeting);
    }
  };

  // Stop / End Live Voice Session
  const endSession = useCallback(() => {
    interruptAssistant();

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        (recognitionRef.current as { stop: () => void }).stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    setIsSessionActive(false);
    setVoiceState("idle");
    setAudioLevel(0);
    setLiveUserSpeech("");
  }, [interruptAssistant]);

  // Toggle Mute
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      startContinuousSpeechRecognition();
    } else {
      setIsMuted(true);
      interruptAssistant();
      if (recognitionRef.current) {
        try {
          (recognitionRef.current as { stop: () => void }).stop();
        } catch {
          // ignore
        }
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  // Orb dynamic scaling based on state and audio volume
  const orbScale =
    voiceState === "listening"
      ? 1 + audioLevel * 0.4
      : voiceState === "speaking"
      ? 1.08 + Math.sin(Date.now() / 200) * 0.06
      : 1;

  return (
    <main
      className={`min-h-screen flex flex-col justify-between font-sans transition-colors duration-300 relative overflow-hidden select-none ${
        isDark ? "bg-[#0a0b0e] text-white" : "bg-[#fcfcfd] text-neutral-900"
      }`}
    >
      {/* Background Ambient Fluid Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-[120px] transition-all duration-700 ${
            voiceState === "listening"
              ? isDark
                ? "bg-emerald-500/15"
                : "bg-emerald-400/20"
              : voiceState === "thinking"
              ? isDark
                ? "bg-indigo-500/20"
                : "bg-indigo-400/25"
              : voiceState === "speaking"
              ? isDark
                ? "bg-sky-500/20"
                : "bg-sky-400/25"
              : isDark
              ? "bg-white/[0.03]"
              : "bg-black/[0.02]"
          }`}
        />
      </div>

      {/* =========================================================================
          1. TOP BAR: BRAND, CONNECTION STATUS, TRANSCRIPT & THEME
      ========================================================================= */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 border-b border-black/[0.05] dark:border-white/[0.06] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <a
            href="/chat"
            onClick={(e) => {
              if (isSessionActive) {
                endSession();
              }
            }}
            className={`p-2 rounded-2xl border transition ${
              isDark
                ? "border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300"
                : "border-black/10 bg-white/80 hover:bg-neutral-100 text-neutral-700"
            }`}
            title="Return to Chat Studio"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>

          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-white shadow-sm p-0.5">
              <img
                src="/logo.png"
                alt="TATTVA AI"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight">
                  TATTVA AI Voice Assistant
                </h1>
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold px-2 py-0.5 border border-emerald-500/20">
                  Sare
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 block leading-tight">
                by kotapati Gowtham Chowdary
              </span>
            </div>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-3">
          {/* Live WebRTC / Audio Status Badge */}
          <div
            className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1 text-xs border ${
              isSessionActive
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                : isDark
                ? "border-neutral-800 bg-neutral-900 text-neutral-400"
                : "border-black/10 bg-neutral-100 text-neutral-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isSessionActive ? "bg-emerald-500 animate-ping" : "bg-neutral-400"
              }`}
            />
            <span>{isSessionActive ? "Live Session Active" : "Disconnected"}</span>
          </div>

          {/* Location Access Badge */}
          <button
            type="button"
            onClick={requestLocation}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
              userLocationName
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : isDark
                ? "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                : "border-black/10 bg-white text-neutral-600 hover:text-black"
            }`}
            title="Location access for weather and live reports (click to update)"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            <span>{userLocationName || "Location"}</span>
          </button>

          {/* Satellite Maps Link */}
          <a
            href="/maps"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                : "border-black/10 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
            title="Open Interactive Satellite Maps"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Maps</span>
          </a>

          {/* Media Studio Link (PDF, DOCX, PPTX, XLSX, CSV) */}
          <a
            href="/media"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                : "border-black/10 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
            title="Open TATTVA AI Document & Media Studio"
          >
            <FolderArchive className="w-3.5 h-3.5 text-black dark:text-white" />
            <span className="hidden sm:inline">Media</span>
          </a>

          {/* Chat / Sare Voice Link */}
          <a
            href="/chat"
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              isDark
                ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                : "border-black/10 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
            title="Back to Chat Assistant"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sare Voice OFF</span>
          </a>

          {/* Transcript Drawer Toggle Button */}
          <button
            type="button"
            onClick={() => setShowTranscript(!showTranscript)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              showTranscript
                ? "bg-black text-white dark:bg-white dark:text-black border-transparent shadow-sm"
                : isDark
                ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                : "border-black/10 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Transcript</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800"
                : "border-black/10 bg-white text-neutral-700 hover:bg-neutral-100"
            }`}
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-neutral-700" />}
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. CENTRAL CONVERSATIONAL VOICE ORB & REAL-TIME VISUALIZATIONS
      ========================================================================= */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-8 z-10">
        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 px-5 text-xs text-red-500 shadow-sm animate-fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="ml-2 font-bold hover:underline"
            >
              ✕
            </button>
          </div>
        )}

        {/* Central Orb Container */}
        <div className="relative flex items-center justify-center cursor-pointer" onClick={isSessionActive ? interruptAssistant : startSession}>
          {/* Concentric Expanding Shockwave Rings (Listening / Speaking) */}
          {isSessionActive && (voiceState === "listening" || voiceState === "speaking") && (
            <>
              <div
                className={`absolute w-72 h-72 rounded-full border border-current pointer-events-none animate-ring-expand ${
                  voiceState === "listening" ? "text-emerald-500/30" : "text-sky-500/30"
                }`}
              />
              <div
                className={`absolute w-84 h-84 rounded-full border border-current pointer-events-none animate-ring-expand [animation-delay:0.8s] ${
                  voiceState === "listening" ? "text-emerald-500/20" : "text-sky-500/20"
                }`}
              />
            </>
          )}

          {/* Master Animated Voice Orb */}
          <div
            style={{ transform: `scale(${orbScale})` }}
            className={`relative w-48 h-48 sm:w-60 sm:h-60 rounded-full transition-transform duration-150 ease-out flex items-center justify-center shadow-2xl backdrop-blur-3xl overflow-hidden ${
              voiceState === "listening"
                ? isDark
                  ? "bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-300 shadow-[0_0_80px_rgba(16,185,129,0.35)]"
                  : "bg-gradient-to-tr from-emerald-500 via-teal-400 to-emerald-200 shadow-[0_0_80px_rgba(16,185,129,0.4)]"
                : voiceState === "thinking"
                ? isDark
                  ? "bg-gradient-to-tr from-indigo-600 via-purple-500 to-blue-400 animate-orb-spin shadow-[0_0_80px_rgba(99,102,241,0.35)]"
                  : "bg-gradient-to-tr from-indigo-500 via-purple-400 to-blue-300 animate-orb-spin shadow-[0_0_80px_rgba(99,102,241,0.4)]"
                : voiceState === "speaking"
                ? isDark
                  ? "bg-gradient-to-tr from-sky-600 via-blue-500 to-cyan-300 animate-orb-pulse shadow-[0_0_80px_rgba(14,165,233,0.35)]"
                  : "bg-gradient-to-tr from-sky-500 via-blue-400 to-cyan-200 animate-orb-pulse shadow-[0_0_80px_rgba(14,165,233,0.4)]"
                : isDark
                ? "bg-gradient-to-tr from-neutral-800 via-neutral-700 to-neutral-600 animate-orb-breathe shadow-[0_0_40px_rgba(255,255,255,0.05)]"
                : "bg-gradient-to-tr from-neutral-200 via-neutral-100 to-white animate-orb-breathe shadow-[0_0_50px_rgba(0,0,0,0.08)] border border-black/[0.08]"
            }`}
          >
            {/* Dynamic Core Shimmer */}
            <div className="absolute inset-2 rounded-full bg-white/20 backdrop-blur-md opacity-60" />

            {/* Inner Icon or Ripple Status */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-4">
              {!isSessionActive ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Mic className="w-8 h-8 text-neutral-400 animate-bounce" />
                  <span className="text-xs font-semibold text-neutral-500">Tap to Start</span>
                </div>
              ) : voiceState === "thinking" ? (
                <div className="flex flex-col items-center gap-1">
                  <Sparkles className="w-8 h-8 text-white animate-spin" />
                  <span className="text-[11px] font-bold text-white tracking-wide">Thinking</span>
                </div>
              ) : voiceState === "speaking" ? (
                <div className="flex flex-col items-center gap-1">
                  <Volume2 className="w-8 h-8 text-white animate-pulse" />
                  <span className="text-[11px] font-bold text-white tracking-wide">Sare Speaking</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Radio className="w-8 h-8 text-white animate-pulse" />
                  <span className="text-[11px] font-bold text-white tracking-wide">Listening</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Real-Time Audio Reactive Waveform Canvas */}
        <div className="mt-8 w-full max-w-sm h-14 flex items-center justify-center">
          <canvas ref={canvasRef} width={380} height={56} className="w-full h-full opacity-80" />
        </div>

        {/* Live Status Pill */}
        <div className="mt-4 text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold shadow-xs border backdrop-blur-md transition-all ${
              voiceState === "listening"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : voiceState === "thinking"
                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 animate-pulse"
                : voiceState === "speaking"
                ? "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                : isDark
                ? "border-neutral-800 bg-neutral-900 text-neutral-400"
                : "border-black/10 bg-white text-neutral-600"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                voiceState === "listening"
                  ? "bg-emerald-500 animate-ping"
                  : voiceState === "thinking"
                  ? "bg-indigo-500"
                  : voiceState === "speaking"
                  ? "bg-sky-500 animate-ping"
                  : "bg-neutral-400"
              }`}
            />
            <span>
              {!isSessionActive
                ? "Ready to connect"
                : isMuted
                ? "Microphone Muted"
                : voiceState === "listening"
                ? liveUserSpeech
                  ? `"${liveUserSpeech}"`
                  : "Listening to your voice..."
                : voiceState === "thinking"
                ? "Processing your thoughts..."
                : "Sare is speaking (speak or tap to interrupt)"}
            </span>
          </div>

          <p className="mt-2 text-[11px] text-neutral-400 max-w-xs mx-auto">
            {isSessionActive
              ? "Barge-in active: speak at any moment to interrupt the assistant naturally."
              : "Experience instant, low-latency voice conversation powered by TATTVA AI."}
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. LIVE CONVERSATION TRANSCRIPT DRAWER (EXPANDABLE)
      ========================================================================= */}
      {showTranscript && (
        <div
          className={`relative z-20 mx-auto w-full max-w-2xl max-h-72 flex flex-col rounded-3xl border shadow-2xl backdrop-blur-3xl p-5 mb-4 animate-scale-in transition-all ${
            isDark ? "border-neutral-800 bg-[#121316]/95 text-white" : "border-black/10 bg-white/95 text-black"
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.06]">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Live Conversation Transcript
            </span>
            <button
              type="button"
              onClick={() => setShowTranscript(false)}
              className="text-neutral-400 hover:text-black dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 py-3 pr-1 text-xs leading-relaxed">
            {transcript.length === 0 ? (
              <div className="text-center py-8 text-neutral-400">
                No conversation yet. Speak into the microphone to begin.
              </div>
            ) : (
              transcript.map((turn) => (
                <div
                  key={turn.id}
                  className={`flex gap-2.5 ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                      turn.role === "user"
                        ? "bg-black text-white dark:bg-white dark:text-black rounded-tr-none"
                        : isDark
                        ? "bg-neutral-800 text-neutral-100 rounded-tl-none border border-neutral-700"
                        : "bg-neutral-100 text-neutral-900 rounded-tl-none border border-neutral-200"
                    }`}
                  >
                    <span className="block font-bold text-[10px] opacity-60 mb-0.5">
                      {turn.role === "user" ? "You" : "Sare (TATTVA AI)"}
                    </span>
                    <span>{turn.text}</span>
                  </div>
                </div>
              ))
            )}
            {liveUserSpeech && (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded-tr-none italic animate-pulse">
                  <span className="block font-bold text-[10px] opacity-60 mb-0.5">Speaking...</span>
                  <span>{liveUserSpeech}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          4. BOTTOM CONTROLS: MUTE, ACTIVATE / END, LANGUAGE SELECTION
      ========================================================================= */}
      <footer className="relative z-20 flex items-center justify-between px-6 py-6 border-t border-black/[0.05] dark:border-white/[0.06] backdrop-blur-xl">
        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium outline-none transition cursor-pointer ${
              isDark
                ? "border-neutral-800 bg-neutral-900 text-neutral-300"
                : "border-black/10 bg-white text-neutral-700"
            }`}
          >
            <option value="auto">🌐 Auto (Telugu, Hindi, English)</option>
            <option value="te-IN">తెలుగు (Telugu Native)</option>
            <option value="hi-IN">हिन्दी (Hindi)</option>
            <option value="ta-IN">தமிழ் (Tamil)</option>
            <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
            <option value="en-US">English (US / Global)</option>
          </select>
        </div>

        {/* Core Audio Action Buttons */}
        <div className="flex items-center gap-4">
          {/* Mute / Unmute Button */}
          {isSessionActive && (
            <button
              type="button"
              onClick={toggleMute}
              className={`p-3.5 rounded-2xl border transition shadow-sm ${
                isMuted
                  ? "bg-red-500 text-white border-red-600 animate-pulse"
                  : isDark
                  ? "border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                  : "border-black/10 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-black"
              }`}
              title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Primary Action Button: Start or End Voice Session */}
          {!isSessionActive ? (
            <button
              type="button"
              onClick={startSession}
              className="flex items-center gap-2.5 rounded-2xl bg-black dark:bg-white text-white dark:text-black px-6 py-3.5 text-xs font-bold shadow-lg transition hover:opacity-90 active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Connect Voice</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={endSession}
              className="flex items-center gap-2 rounded-2xl bg-red-600 text-white px-5 py-3.5 text-xs font-bold shadow-lg transition hover:bg-red-700 active:scale-95"
              title="Disconnect voice conversation"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">End Session</span>
            </button>
          )}

          {/* Interrupt Button (When AI is speaking) */}
          {isSessionActive && voiceState === "speaking" && (
            <button
              type="button"
              onClick={interruptAssistant}
              className="p-3.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition"
              title="Interrupt assistant"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Footer info & Cross-Page Links */}
        <div className="hidden md:flex items-center gap-3 text-[11px] text-neutral-400">
          <span>Continuous Speech &bull; Female Voice Sare</span>
          <span>&bull;</span>
          <a href="/" className="hover:text-neutral-600 dark:hover:text-neutral-200 transition">Chat</a>
          <a href="/maps" className="hover:text-neutral-600 dark:hover:text-neutral-200 transition">Maps</a>
          <a href="/download" className="hover:text-neutral-600 dark:hover:text-neutral-200 transition">App APK</a>
        </div>
      </footer>
    </main>
  );
}
