"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  RefreshCw,
  VideoOff,
} from "lucide-react";

export interface CameraCaptureModalProps {
  isOpen: boolean;
  isDark?: boolean;
  onClose: () => void;
  onCapture: (capturedImage: { name: string; type: string; data: string; size: number }) => void;
}

export default function CameraCaptureModal({
  isOpen,
  isDark = true,
  onClose,
  onCapture,
}: CameraCaptureModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  // Stop active video stream tracks
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      setStream(null);
    }
  }, [stream]);

  // Start camera stream using getUserMedia
  const startCamera = useCallback(async (preferredFacing: "user" | "environment") => {
    stopStream();
    setErrorMsg(null);
    setIsInitializing(true);

    if (
      typeof window === "undefined" ||
      !navigator?.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setIsInitializing(false);
      setErrorMsg("Camera access is not supported by this browser. You can use file capture below.");
      return;
    }

    try {
      // Check available video devices
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setHasMultipleCameras(videoDevices.length > 1);

      // Attempt high-quality stream
      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: preferredFacing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        // Fallback to basic video constraint
        newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      let message = "Could not access camera.";
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        message = "Camera permission was denied. Please allow camera access in your browser settings to take photos.";
      } else if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        message = "No physical camera device was detected on your system.";
      } else if (err?.name === "NotReadableError" || err?.name === "TrackStartError") {
        message = "Camera hardware is currently in use by another application.";
      }
      setErrorMsg(message);
    } finally {
      setIsInitializing(false);
    }
  }, [stopStream]);

  // Handle open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedDataUrl(null);
      setErrorMsg(null);
      startCamera(facingMode);
    } else {
      stopStream();
      setCapturedDataUrl(null);
    }

    return () => {
      stopStream();
    };
  }, [isOpen]);

  // Attach stream to video ref whenever stream updates
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  // Flip camera between front and back
  const handleToggleFacing = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Capture still image frame from live stream to canvas
  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement("canvas");
    }
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Flip horizontal if using front camera
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCapturedDataUrl(dataUrl);

    // Stop camera stream while user reviews photo
    stopStream();
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedDataUrl(null);
    startCamera(facingMode);
  };

  // Submit captured image to conversation
  const handleSendPhoto = () => {
    if (!capturedDataUrl) return;

    // Calculate approximate size in bytes from base64
    const headLen = capturedDataUrl.indexOf(",") + 1;
    const b64Len = capturedDataUrl.length - headLen;
    const sizeInBytes = Math.round((b64Len * 3) / 4);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    onCapture({
      name: `camera-capture-${timestamp}.jpg`,
      type: "image/jpeg",
      data: capturedDataUrl,
      size: sizeInBytes,
    });

    handleCloseModal();
  };

  // Handle fallback file capture (e.g. mobile device native camera)
  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      onCapture({
        name: file.name || `photo-${Date.now()}.jpg`,
        type: file.type || "image/jpeg",
        data: result,
        size: file.size,
      });
      handleCloseModal();
    };
    reader.readAsDataURL(file);
  };

  const handleCloseModal = () => {
    stopStream();
    setCapturedDataUrl(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleCloseModal}
    >
      <div
        className={`relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-3xl border overflow-hidden shadow-2xl transition-all ${
          isDark
            ? "border-neutral-800 bg-[#121316] text-white"
            : "border-neutral-200 bg-white text-neutral-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
              <Camera className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="font-semibold text-base tracking-tight">Camera</h3>
              <p className="text-xs text-neutral-400">
                {capturedDataUrl ? "Review photo before sending" : "Position subject in frame"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative flex-1 min-h-[320px] sm:min-h-[400px] bg-black flex items-center justify-center overflow-hidden">
          {/* Live Video Preview */}
          {!capturedDataUrl && !errorMsg && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover max-h-[500px] ${
                facingMode === "user" ? "-scale-x-100" : ""
              }`}
            />
          )}

          {/* Captured Image Review */}
          {capturedDataUrl && (
            <img
              src={capturedDataUrl}
              alt="Captured"
              className="w-full h-full object-contain max-h-[500px]"
            />
          )}

          {/* Initializing Spinner */}
          {isInitializing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-3 z-10">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
              <p className="text-sm font-medium">Starting camera...</p>
            </div>
          )}

          {/* Error / Permission Blocked Message */}
          {errorMsg && !capturedDataUrl && (
            <div className="flex flex-col items-center justify-center text-center p-6 max-w-md gap-4 z-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                <VideoOff className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white mb-1.5">Camera Unavailable</p>
                <p className="text-xs text-neutral-300 leading-relaxed">{errorMsg}</p>
              </div>

              {/* Fallback Mobile / Native Capture Button */}
              <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-2">
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition cursor-pointer"
                >
                  Retry Permission
                </button>
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-xs font-semibold transition cursor-pointer"
                >
                  Use Device Camera
                </button>
              </div>
            </div>
          )}

          {/* Camera Flip Button (Only when multiple cameras detected) */}
          {!capturedDataUrl && !errorMsg && hasMultipleCameras && (
            <button
              type="button"
              onClick={handleToggleFacing}
              className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md hover:bg-black/80 transition cursor-pointer active:scale-95"
              title="Flip camera"
            >
              <RefreshCw className="w-5 h-5 stroke-[2]" />
            </button>
          )}

          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fallbackInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFallbackFile}
            className="hidden"
          />
        </div>

        {/* Action Controls Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/20">
          {!capturedDataUrl ? (
            <>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(errorMsg) || isInitializing}
                onClick={handleCapturePhoto}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white text-black hover:bg-neutral-200 font-semibold text-sm transition shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Camera className="w-4 h-4 stroke-[2]" />
                Take Photo
              </button>
              <div className="w-14" />
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 stroke-[2]" />
                Retake
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendPhoto}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition shadow-lg active:scale-95 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  Send Photo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
